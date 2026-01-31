/**
 * Contracts API Service
 */

import { prisma } from "@modules/database/client.js";
import type { Result } from "@shared/types/index.js";
import type {
  ContractFilters,
  ContractSortOptions,
  PaginationOptions,
  ContractListItemDto,
  ContractDetailDto,
  PaginatedResponse,
  ApiError,
  AnomalyScoreDto,
  SimilarContractsFilters,
  SimilarContractsResponseDto,
  SimilarContractDto,
  CategoryStatisticsDto,
  AmendmentDto,
} from "./types.js";
import type {
  ScoreBreakdownItem,
  ScoreCategory,
} from "@modules/anomalies/types/index.js";
import type { Prisma } from "@/generated/prisma/client.js";

// Default pagination
const DEFAULT_PAGE = 1;
const MAX_PAGE_SIZE = 100;

// Build where clause from filters
function buildWhereClause(filters: ContractFilters): Prisma.ContractWhereInput {
  const where: Prisma.ContractWhereInput = {};

  if (filters.category) {
    where.category = filters.category as Prisma.EnumContractCategoryFilter;
  }

  if (filters.agencyId) {
    where.agencyId = filters.agencyId;
  }

  if (filters.supplierId) {
    where.supplierId = filters.supplierId;
  }

  if (filters.startDate || filters.endDate) {
    where.signatureDate = {};
    if (filters.startDate) {
      where.signatureDate.gte = filters.startDate;
    }
    if (filters.endDate) {
      where.signatureDate.lte = filters.endDate;
    }
  }

  if (filters.minScore !== undefined) {
    where.anomalyScore = {
      totalScore: { gte: filters.minScore },
    };
  }

  return where;
}

// Build order by clause
function buildOrderByClause(
  sort?: ContractSortOptions
): Prisma.ContractOrderByWithRelationInput[] {
  if (!sort) {
    return [{ signatureDate: "desc" }];
  }

  const order = sort.order;

  switch (sort.field) {
    case "signatureDate":
      return [{ signatureDate: order }];
    case "value":
      return [{ value: order }];
    case "totalScore":
      return [{ anomalyScore: { totalScore: order } }];
    default:
      return [{ signatureDate: "desc" }];
  }
}

// Build score breakdown from anomaly score record
function buildScoreBreakdown(score: {
  valueScore: number;
  valueReason: string | null;
  amendmentScore: number;
  amendmentReason: string | null;
  concentrationScore: number;
  concentrationReason: string | null;
  durationScore: number;
  durationReason: string | null;
}): ScoreBreakdownItem[] {
  return [
    {
      criterion: "value",
      score: score.valueScore,
      reason: score.valueReason,
      isContributing: score.valueScore > 0,
    },
    {
      criterion: "amendment",
      score: score.amendmentScore,
      reason: score.amendmentReason,
      isContributing: score.amendmentScore > 0,
    },
    {
      criterion: "concentration",
      score: score.concentrationScore,
      reason: score.concentrationReason,
      isContributing: score.concentrationScore > 0,
    },
    {
      criterion: "duration",
      score: score.durationScore,
      reason: score.durationReason,
      isContributing: score.durationScore > 0,
    },
  ];
}

// Transform anomaly score to DTO
function transformAnomalyScore(
  score: {
    totalScore: number;
    category: string;
    valueScore: number;
    valueReason: string | null;
    amendmentScore: number;
    amendmentReason: string | null;
    concentrationScore: number;
    concentrationReason: string | null;
    durationScore: number;
    durationReason: string | null;
    calculatedAt: Date;
  } | null
): AnomalyScoreDto | null {
  if (!score) return null;

  return {
    totalScore: score.totalScore,
    category: score.category as ScoreCategory,
    breakdown: buildScoreBreakdown(score),
    calculatedAt: score.calculatedAt,
  };
}

// Calculate statistics from values array
function calculateStatistics(values: number[]): CategoryStatisticsDto {
  if (values.length === 0) {
    return {
      count: 0,
      average: 0,
      median: 0,
      min: 0,
      max: 0,
      standardDeviation: 0,
    };
  }

  const count = values.length;
  const sum = values.reduce((acc, val) => acc + val, 0);
  const average = sum / count;
  const min = Math.min(...values);
  const max = Math.max(...values);

  // Calculate median
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(count / 2);
  let median: number;
  if (count % 2 !== 0) {
    median = sorted[mid] ?? 0;
  } else {
    median = ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
  }

  // Calculate standard deviation
  const squaredDiffs = values.map((val) => Math.pow(val - average, 2));
  const avgSquaredDiff =
    squaredDiffs.reduce((acc, val) => acc + val, 0) / count;
  const standardDeviation = Math.sqrt(avgSquaredDiff);

  return {
    count,
    average: Math.round(average * 100) / 100,
    median: Math.round(median * 100) / 100,
    min,
    max,
    standardDeviation: Math.round(standardDeviation * 100) / 100,
  };
}

// Contract service interface
export interface ContractService {
  listContracts(
    filters: ContractFilters,
    pagination: PaginationOptions,
    sort?: ContractSortOptions
  ): Promise<Result<PaginatedResponse<ContractListItemDto>, ApiError>>;

  getContractById(id: string): Promise<Result<ContractDetailDto, ApiError>>;

  getSimilarContracts(
    id: string,
    filters: SimilarContractsFilters
  ): Promise<Result<SimilarContractsResponseDto, ApiError>>;

  getContractAmendments(
    contractId: string
  ): Promise<Result<AmendmentDto[], ApiError>>;
}

// Create contract service
export function createContractService(): ContractService {
  return {
    async listContracts(
      filters: ContractFilters,
      pagination: PaginationOptions,
      sort?: ContractSortOptions
    ): Promise<Result<PaginatedResponse<ContractListItemDto>, ApiError>> {
      try {
        const page = Math.max(DEFAULT_PAGE, pagination.page);
        const pageSize = Math.min(
          MAX_PAGE_SIZE,
          Math.max(1, pagination.pageSize)
        );
        const skip = (page - 1) * pageSize;

        const where = buildWhereClause(filters);
        const orderBy = buildOrderByClause(sort);

        const [contracts, total] = await Promise.all([
          prisma.contract.findMany({
            where,
            orderBy,
            skip,
            take: pageSize,
            select: {
              id: true,
              externalId: true,
              number: true,
              object: true,
              value: true,
              category: true,
              status: true,
              signatureDate: true,
              agency: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  acronym: true,
                },
              },
              supplier: {
                select: {
                  id: true,
                  cnpj: true,
                  tradeName: true,
                  legalName: true,
                },
              },
              anomalyScore: {
                select: {
                  totalScore: true,
                  category: true,
                  valueScore: true,
                  valueReason: true,
                  amendmentScore: true,
                  amendmentReason: true,
                  concentrationScore: true,
                  concentrationReason: true,
                  durationScore: true,
                  durationReason: true,
                  calculatedAt: true,
                },
              },
            },
          }),
          prisma.contract.count({ where }),
        ]);

        const data: ContractListItemDto[] = contracts.map((contract) => ({
          id: contract.id,
          externalId: contract.externalId,
          number: contract.number,
          object: contract.object,
          value: Number(contract.value),
          category: contract.category,
          status: contract.status,
          signatureDate: contract.signatureDate,
          agency: contract.agency,
          supplier: contract.supplier,
          anomalyScore: transformAnomalyScore(contract.anomalyScore),
        }));

        return {
          success: true,
          data: {
            data,
            pagination: {
              page,
              pageSize,
              total,
              totalPages: Math.ceil(total / pageSize),
            },
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: "DATABASE_ERROR",
            message: "Failed to fetch contracts",
            details: error instanceof Error ? error.message : String(error),
          },
        };
      }
    },

    async getContractById(
      id: string
    ): Promise<Result<ContractDetailDto, ApiError>> {
      try {
        const contract = await prisma.contract.findUnique({
          where: { id },
          select: {
            id: true,
            externalId: true,
            number: true,
            object: true,
            value: true,
            category: true,
            status: true,
            modalidade: true,
            signatureDate: true,
            startDate: true,
            endDate: true,
            publicationDate: true,
            summary: true,
            summaryGeneratedAt: true,
            createdAt: true,
            updatedAt: true,
            agency: {
              select: {
                id: true,
                code: true,
                name: true,
                acronym: true,
              },
            },
            supplier: {
              select: {
                id: true,
                cnpj: true,
                tradeName: true,
                legalName: true,
              },
            },
            anomalyScore: {
              select: {
                totalScore: true,
                category: true,
                valueScore: true,
                valueReason: true,
                amendmentScore: true,
                amendmentReason: true,
                concentrationScore: true,
                concentrationReason: true,
                durationScore: true,
                durationReason: true,
                calculatedAt: true,
              },
            },
            _count: {
              select: {
                amendments: true,
              },
            },
          },
        });

        if (!contract) {
          return {
            success: false,
            error: {
              code: "NOT_FOUND",
              message: `Contract with ID ${id} not found`,
            },
          };
        }

        return {
          success: true,
          data: {
            id: contract.id,
            externalId: contract.externalId,
            number: contract.number,
            object: contract.object,
            value: Number(contract.value),
            category: contract.category,
            status: contract.status,
            modalidade: contract.modalidade,
            signatureDate: contract.signatureDate,
            startDate: contract.startDate,
            endDate: contract.endDate,
            publicationDate: contract.publicationDate,
            summary: contract.summary,
            summaryGeneratedAt: contract.summaryGeneratedAt,
            amendmentCount: contract._count.amendments,
            createdAt: contract.createdAt,
            updatedAt: contract.updatedAt,
            agency: contract.agency,
            supplier: contract.supplier,
            anomalyScore: transformAnomalyScore(contract.anomalyScore),
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: "DATABASE_ERROR",
            message: "Failed to fetch contract",
            details: error instanceof Error ? error.message : String(error),
          },
        };
      }
    },

    async getSimilarContracts(
      id: string,
      filters: SimilarContractsFilters
    ): Promise<Result<SimilarContractsResponseDto, ApiError>> {
      try {
        // First, get the reference contract
        const referenceContract = await prisma.contract.findUnique({
          where: { id },
          select: {
            id: true,
            value: true,
            category: true,
          },
        });

        if (!referenceContract) {
          return {
            success: false,
            error: {
              code: "NOT_FOUND",
              message: `Contract with ID ${id} not found`,
            },
          };
        }

        // Build where clause for similar contracts
        const where: Prisma.ContractWhereInput = {
          category: referenceContract.category,
          id: { not: id }, // Exclude reference contract
        };

        // Add date filters if provided
        if (filters.startDate || filters.endDate) {
          where.signatureDate = {};
          if (filters.startDate) {
            where.signatureDate.gte = filters.startDate;
          }
          if (filters.endDate) {
            where.signatureDate.lte = filters.endDate;
          }
        }

        // Fetch similar contracts
        const similarContracts = await prisma.contract.findMany({
          where,
          orderBy: { signatureDate: "desc" },
          take: 50, // Limit to 50 similar contracts
          select: {
            id: true,
            externalId: true,
            number: true,
            object: true,
            value: true,
            signatureDate: true,
            agency: {
              select: {
                id: true,
                code: true,
                name: true,
                acronym: true,
              },
            },
            supplier: {
              select: {
                id: true,
                cnpj: true,
                tradeName: true,
                legalName: true,
              },
            },
            anomalyScore: {
              select: {
                totalScore: true,
                category: true,
                valueScore: true,
                valueReason: true,
                amendmentScore: true,
                amendmentReason: true,
                concentrationScore: true,
                concentrationReason: true,
                durationScore: true,
                durationReason: true,
                calculatedAt: true,
              },
            },
          },
        });

        // Calculate statistics from all contracts in category (including reference)
        const allCategoryContracts = await prisma.contract.findMany({
          where: {
            category: referenceContract.category,
            ...(filters.startDate || filters.endDate
              ? {
                  signatureDate: {
                    ...(filters.startDate ? { gte: filters.startDate } : {}),
                    ...(filters.endDate ? { lte: filters.endDate } : {}),
                  },
                }
              : {}),
          },
          select: { value: true },
        });

        const values = allCategoryContracts.map((c) => Number(c.value));
        const statistics = calculateStatistics(values);

        // Transform to DTOs
        const similarContractDtos: SimilarContractDto[] = similarContracts.map(
          (contract) => ({
            id: contract.id,
            externalId: contract.externalId,
            number: contract.number,
            object: contract.object,
            value: Number(contract.value),
            signatureDate: contract.signatureDate,
            agency: contract.agency,
            supplier: contract.supplier,
            anomalyScore: transformAnomalyScore(contract.anomalyScore),
          })
        );

        return {
          success: true,
          data: {
            referenceContract: {
              id: referenceContract.id,
              value: Number(referenceContract.value),
              category: referenceContract.category,
            },
            similarContracts: similarContractDtos,
            statistics,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: "DATABASE_ERROR",
            message: "Failed to fetch similar contracts",
            details: error instanceof Error ? error.message : String(error),
          },
        };
      }
    },

    async getContractAmendments(
      contractId: string
    ): Promise<Result<AmendmentDto[], ApiError>> {
      try {
        // Check if contract exists
        const contract = await prisma.contract.findUnique({
          where: { id: contractId },
          select: { id: true },
        });

        if (!contract) {
          return {
            success: false,
            error: {
              code: "NOT_FOUND",
              message: `Contract with ID ${contractId} not found`,
            },
          };
        }

        const amendments = await prisma.amendment.findMany({
          where: { contractId },
          orderBy: { number: "asc" },
          select: {
            id: true,
            externalId: true,
            number: true,
            type: true,
            description: true,
            valueChange: true,
            durationChange: true,
            signatureDate: true,
          },
        });

        return {
          success: true,
          data: amendments.map((a) => ({
            id: a.id,
            externalId: a.externalId,
            number: a.number,
            type: a.type,
            description: a.description,
            valueChange: a.valueChange ? Number(a.valueChange) : null,
            durationChange: a.durationChange,
            signatureDate: a.signatureDate,
          })),
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: "DATABASE_ERROR",
            message: "Failed to fetch contract amendments",
            details: error instanceof Error ? error.message : String(error),
          },
        };
      }
    },
  };
}
