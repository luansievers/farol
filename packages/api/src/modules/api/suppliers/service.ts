/**
 * Suppliers API Service
 */

import { prisma } from "@modules/database/client.js";
import type { Result } from "@shared/types/index.js";
import type {
  SupplierFilters,
  SupplierSortOptions,
  PaginationOptions,
  SupplierListItemDto,
  SupplierDetailDto,
  PaginatedResponse,
  ApiError,
  AnomalyScoreDto,
  SupplierContractDto,
} from "./types.js";
import type {
  ScoreBreakdownItem,
  ScoreCategory,
} from "@modules/anomalies/types/index.js";
import type { Prisma } from "@/generated/prisma/client.js";

// Default pagination
const DEFAULT_PAGE = 1;
const MAX_PAGE_SIZE = 100;
const DEFAULT_CONTRACTS_LIMIT = 10;

// Build where clause from filters
function buildWhereClause(filters: SupplierFilters): Prisma.SupplierWhereInput {
  const where: Prisma.SupplierWhereInput = {};

  if (filters.search) {
    where.OR = [
      { tradeName: { contains: filters.search, mode: "insensitive" } },
      { legalName: { contains: filters.search, mode: "insensitive" } },
      { cnpj: { contains: filters.search } },
    ];
  }

  return where;
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
  timingScore: number | null;
  timingReason: string | null;
  roundNumberScore: number | null;
  roundNumberReason: string | null;
  fragmentationScore: number | null;
  fragmentationReason: string | null;
  descriptionScore: number | null;
  descriptionReason: string | null;
}): ScoreBreakdownItem[] {
  const breakdown: ScoreBreakdownItem[] = [
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

  if (score.timingScore !== null) {
    breakdown.push({
      criterion: "timing",
      score: score.timingScore,
      reason: score.timingReason,
      isContributing: score.timingScore > 0,
    });
  }

  if (score.roundNumberScore !== null) {
    breakdown.push({
      criterion: "roundNumber",
      score: score.roundNumberScore,
      reason: score.roundNumberReason,
      isContributing: score.roundNumberScore > 0,
    });
  }

  if (score.fragmentationScore !== null) {
    breakdown.push({
      criterion: "fragmentation",
      score: score.fragmentationScore,
      reason: score.fragmentationReason,
      isContributing: score.fragmentationScore > 0,
    });
  }

  if (score.descriptionScore !== null) {
    breakdown.push({
      criterion: "description",
      score: score.descriptionScore,
      reason: score.descriptionReason,
      isContributing: score.descriptionScore > 0,
    });
  }

  return breakdown;
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
    timingScore: number | null;
    timingReason: string | null;
    roundNumberScore: number | null;
    roundNumberReason: string | null;
    fragmentationScore: number | null;
    fragmentationReason: string | null;
    descriptionScore: number | null;
    descriptionReason: string | null;
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

// Supplier service interface
export interface SupplierService {
  listSuppliers(
    filters: SupplierFilters,
    pagination: PaginationOptions,
    sort?: SupplierSortOptions
  ): Promise<Result<PaginatedResponse<SupplierListItemDto>, ApiError>>;

  getSupplierById(id: string): Promise<Result<SupplierDetailDto, ApiError>>;
}

// Create supplier service
export function createSupplierService(): SupplierService {
  return {
    async listSuppliers(
      filters: SupplierFilters,
      pagination: PaginationOptions,
      sort?: SupplierSortOptions
    ): Promise<Result<PaginatedResponse<SupplierListItemDto>, ApiError>> {
      try {
        const page = Math.max(DEFAULT_PAGE, pagination.page);
        const pageSize = Math.min(
          MAX_PAGE_SIZE,
          Math.max(1, pagination.pageSize)
        );
        const skip = (page - 1) * pageSize;

        const where = buildWhereClause(filters);

        // Get suppliers with aggregated metrics
        const [suppliers, total] = await Promise.all([
          prisma.supplier.findMany({
            where,
            skip,
            take: pageSize,
            select: {
              id: true,
              cnpj: true,
              tradeName: true,
              legalName: true,
              contracts: {
                select: {
                  value: true,
                  anomalyScore: {
                    select: {
                      totalScore: true,
                    },
                  },
                },
              },
            },
            orderBy:
              sort?.field === "tradeName"
                ? { tradeName: sort.order }
                : { tradeName: "asc" },
          }),
          prisma.supplier.count({ where }),
        ]);

        // Calculate metrics for each supplier
        const data: SupplierListItemDto[] = suppliers.map((supplier) => {
          const totalContracts = supplier.contracts.length;
          const totalValue = supplier.contracts.reduce(
            (sum, contract) => sum + Number(contract.value),
            0
          );
          const scoresWithValues = supplier.contracts
            .map((c) => c.anomalyScore?.totalScore)
            .filter((score): score is number => score !== undefined);
          const averageScore =
            scoresWithValues.length > 0
              ? scoresWithValues.reduce((sum, score) => sum + score, 0) /
                scoresWithValues.length
              : null;

          return {
            id: supplier.id,
            cnpj: supplier.cnpj,
            tradeName: supplier.tradeName,
            legalName: supplier.legalName,
            metrics: {
              totalContracts,
              totalValue: Math.round(totalValue * 100) / 100,
              averageScore:
                averageScore !== null
                  ? Math.round(averageScore * 100) / 100
                  : null,
            },
          };
        });

        // Sort by metrics if needed (can't be done in DB directly)
        if (sort?.field === "totalContracts") {
          data.sort((a, b) =>
            sort.order === "asc"
              ? a.metrics.totalContracts - b.metrics.totalContracts
              : b.metrics.totalContracts - a.metrics.totalContracts
          );
        } else if (sort?.field === "totalValue") {
          data.sort((a, b) =>
            sort.order === "asc"
              ? a.metrics.totalValue - b.metrics.totalValue
              : b.metrics.totalValue - a.metrics.totalValue
          );
        } else if (sort?.field === "averageScore") {
          data.sort((a, b) => {
            const scoreA = a.metrics.averageScore ?? -1;
            const scoreB = b.metrics.averageScore ?? -1;
            return sort.order === "asc" ? scoreA - scoreB : scoreB - scoreA;
          });
        }

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
            message: "Failed to fetch suppliers",
            details: error instanceof Error ? error.message : String(error),
          },
        };
      }
    },

    async getSupplierById(
      id: string
    ): Promise<Result<SupplierDetailDto, ApiError>> {
      try {
        const supplier = await prisma.supplier.findUnique({
          where: { id },
          select: {
            id: true,
            cnpj: true,
            tradeName: true,
            legalName: true,
            createdAt: true,
            updatedAt: true,
            contracts: {
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
                    timingScore: true,
                    timingReason: true,
                    roundNumberScore: true,
                    roundNumberReason: true,
                    fragmentationScore: true,
                    fragmentationReason: true,
                    descriptionScore: true,
                    descriptionReason: true,
                    calculatedAt: true,
                  },
                },
              },
              orderBy: { signatureDate: "desc" },
              take: DEFAULT_CONTRACTS_LIMIT,
            },
          },
        });

        if (!supplier) {
          return {
            success: false,
            error: {
              code: "NOT_FOUND",
              message: `Supplier with ID ${id} not found`,
            },
          };
        }

        // Calculate metrics
        const allContracts = await prisma.contract.findMany({
          where: { supplierId: id },
          select: {
            value: true,
            anomalyScore: {
              select: { totalScore: true },
            },
          },
        });

        const totalContracts = allContracts.length;
        const totalValue = allContracts.reduce(
          (sum, contract) => sum + Number(contract.value),
          0
        );
        const scoresWithValues = allContracts
          .map((c) => c.anomalyScore?.totalScore)
          .filter((score): score is number => score !== undefined);
        const averageScore =
          scoresWithValues.length > 0
            ? scoresWithValues.reduce((sum, score) => sum + score, 0) /
              scoresWithValues.length
            : null;

        const contracts: SupplierContractDto[] = supplier.contracts.map(
          (contract) => ({
            id: contract.id,
            externalId: contract.externalId,
            number: contract.number,
            object: contract.object,
            value: Number(contract.value),
            category: contract.category,
            status: contract.status,
            signatureDate: contract.signatureDate,
            agency: contract.agency,
            anomalyScore: transformAnomalyScore(contract.anomalyScore),
          })
        );

        return {
          success: true,
          data: {
            id: supplier.id,
            cnpj: supplier.cnpj,
            tradeName: supplier.tradeName,
            legalName: supplier.legalName,
            metrics: {
              totalContracts,
              totalValue: Math.round(totalValue * 100) / 100,
              averageScore:
                averageScore !== null
                  ? Math.round(averageScore * 100) / 100
                  : null,
            },
            contracts,
            createdAt: supplier.createdAt,
            updatedAt: supplier.updatedAt,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: "DATABASE_ERROR",
            message: "Failed to fetch supplier",
            details: error instanceof Error ? error.message : String(error),
          },
        };
      }
    },
  };
}
