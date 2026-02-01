/**
 * Search API Service
 */

import { prisma } from "@modules/database/client.js";
import type {
  SearchFilters,
  GroupedSearchResults,
  FullSearchResults,
  ContractSearchResult,
  SupplierSearchResult,
  AgencySearchResult,
  SearchResult,
} from "./types.js";

// Default limits
const DEFAULT_AUTOCOMPLETE_LIMIT = 5;
const DEFAULT_SEARCH_LIMIT = 20;

// Search service interface
export interface SearchService {
  autocomplete(
    filters: SearchFilters
  ): Promise<SearchResult<GroupedSearchResults>>;

  fullSearch(filters: SearchFilters): Promise<SearchResult<FullSearchResults>>;
}

// Create search service
export function createSearchService(): SearchService {
  return {
    async autocomplete(
      filters: SearchFilters
    ): Promise<SearchResult<GroupedSearchResults>> {
      try {
        const { query, types, limit = DEFAULT_AUTOCOMPLETE_LIMIT } = filters;
        const searchTerm = query.trim().toLowerCase();

        if (searchTerm.length < 2) {
          return {
            success: true,
            data: {
              contracts: [],
              suppliers: [],
              agencies: [],
              totalCount: 0,
            },
          };
        }

        const includeContracts = !types || types.includes("contract");
        const includeSuppliers = !types || types.includes("supplier");
        const includeAgencies = !types || types.includes("agency");

        // Parallel queries
        const [contracts, suppliers, agencies] = await Promise.all([
          includeContracts ? searchContracts(searchTerm, limit) : [],
          includeSuppliers ? searchSuppliers(searchTerm, limit) : [],
          includeAgencies ? searchAgencies(searchTerm, limit) : [],
        ]);

        return {
          success: true,
          data: {
            contracts,
            suppliers,
            agencies,
            totalCount: contracts.length + suppliers.length + agencies.length,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: "DATABASE_ERROR",
            message: "Failed to perform search",
            details: error instanceof Error ? error.message : String(error),
          },
        };
      }
    },

    async fullSearch(
      filters: SearchFilters
    ): Promise<SearchResult<FullSearchResults>> {
      try {
        const { query, types, limit = DEFAULT_SEARCH_LIMIT } = filters;
        const searchTerm = query.trim().toLowerCase();

        if (searchTerm.length < 2) {
          return {
            success: true,
            data: {
              contracts: { items: [], total: 0 },
              suppliers: { items: [], total: 0 },
              agencies: { items: [], total: 0 },
            },
          };
        }

        const includeContracts = !types || types.includes("contract");
        const includeSuppliers = !types || types.includes("supplier");
        const includeAgencies = !types || types.includes("agency");

        // Parallel queries with counts
        const [
          contracts,
          contractsCount,
          suppliers,
          suppliersCount,
          agencies,
          agenciesCount,
        ] = await Promise.all([
          includeContracts ? searchContracts(searchTerm, limit) : [],
          includeContracts ? countContracts(searchTerm) : 0,
          includeSuppliers ? searchSuppliers(searchTerm, limit) : [],
          includeSuppliers ? countSuppliers(searchTerm) : 0,
          includeAgencies ? searchAgencies(searchTerm, limit) : [],
          includeAgencies ? countAgencies(searchTerm) : 0,
        ]);

        return {
          success: true,
          data: {
            contracts: { items: contracts, total: contractsCount },
            suppliers: { items: suppliers, total: suppliersCount },
            agencies: { items: agencies, total: agenciesCount },
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: "DATABASE_ERROR",
            message: "Failed to perform search",
            details: error instanceof Error ? error.message : String(error),
          },
        };
      }
    },
  };
}

// Helper: Search contracts by object
async function searchContracts(
  searchTerm: string,
  limit: number
): Promise<ContractSearchResult[]> {
  const contracts = await prisma.contract.findMany({
    where: {
      object: {
        contains: searchTerm,
        mode: "insensitive",
      },
    },
    take: limit,
    orderBy: { signatureDate: "desc" },
    select: {
      id: true,
      number: true,
      object: true,
      value: true,
      category: true,
      anomalyScore: {
        select: {
          totalScore: true,
        },
      },
    },
  });

  return contracts.map((contract) => ({
    id: contract.id,
    type: "contract" as const,
    label:
      contract.object.length > 100
        ? contract.object.substring(0, 100) + "..."
        : contract.object,
    sublabel: `Contrato ${contract.number}`,
    value: Number(contract.value),
    category: contract.category,
    anomalyScore: contract.anomalyScore?.totalScore ?? null,
  }));
}

// Helper: Count contracts matching search
async function countContracts(searchTerm: string): Promise<number> {
  return prisma.contract.count({
    where: {
      object: {
        contains: searchTerm,
        mode: "insensitive",
      },
    },
  });
}

// Helper: Search suppliers by name or CNPJ
async function searchSuppliers(
  searchTerm: string,
  limit: number
): Promise<SupplierSearchResult[]> {
  const suppliers = await prisma.supplier.findMany({
    where: {
      OR: [
        { tradeName: { contains: searchTerm, mode: "insensitive" } },
        { legalName: { contains: searchTerm, mode: "insensitive" } },
        { cnpj: { contains: searchTerm } },
      ],
    },
    take: limit,
    orderBy: { tradeName: "asc" },
    select: {
      id: true,
      cnpj: true,
      tradeName: true,
      legalName: true,
      _count: {
        select: {
          contracts: true,
        },
      },
      contracts: {
        select: {
          value: true,
        },
      },
    },
  });

  return suppliers.map((supplier) => ({
    id: supplier.id,
    type: "supplier" as const,
    label: supplier.tradeName || supplier.legalName,
    sublabel: formatCnpj(supplier.cnpj),
    cnpj: supplier.cnpj,
    totalContracts: supplier._count.contracts,
    totalValue: supplier.contracts.reduce((sum, c) => sum + Number(c.value), 0),
  }));
}

// Helper: Count suppliers matching search
async function countSuppliers(searchTerm: string): Promise<number> {
  return prisma.supplier.count({
    where: {
      OR: [
        { tradeName: { contains: searchTerm, mode: "insensitive" } },
        { legalName: { contains: searchTerm, mode: "insensitive" } },
        { cnpj: { contains: searchTerm } },
      ],
    },
  });
}

// Helper: Search agencies by name, acronym, or code
async function searchAgencies(
  searchTerm: string,
  limit: number
): Promise<AgencySearchResult[]> {
  const agencies = await prisma.agency.findMany({
    where: {
      OR: [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { acronym: { contains: searchTerm, mode: "insensitive" } },
        { code: { contains: searchTerm, mode: "insensitive" } },
      ],
    },
    take: limit,
    orderBy: { name: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      acronym: true,
      _count: {
        select: {
          contracts: true,
        },
      },
      contracts: {
        select: {
          value: true,
        },
      },
    },
  });

  return agencies.map((agency) => ({
    id: agency.id,
    type: "agency" as const,
    label: agency.name,
    sublabel: agency.acronym ?? agency.code,
    code: agency.code,
    totalContracts: agency._count.contracts,
    totalValue: agency.contracts.reduce((sum, c) => sum + Number(c.value), 0),
  }));
}

// Helper: Count agencies matching search
async function countAgencies(searchTerm: string): Promise<number> {
  return prisma.agency.count({
    where: {
      OR: [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { acronym: { contains: searchTerm, mode: "insensitive" } },
        { code: { contains: searchTerm, mode: "insensitive" } },
      ],
    },
  });
}

// Helper: Format CNPJ
function formatCnpj(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) return cnpj;
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5"
  );
}
