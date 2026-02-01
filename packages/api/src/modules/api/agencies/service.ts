/**
 * Agencies API Service
 */

import { prisma } from "@modules/database/client.js";
import type { Result } from "@shared/types/index.js";
import type {
  AgencyFilters,
  AgencySortOptions,
  PaginationOptions,
  AgencyListItemDto,
  AgencyDetailDto,
  PaginatedResponse,
  ApiError,
  AnomalyScoreDto,
  AgencyContractDto,
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
function buildWhereClause(filters: AgencyFilters): Prisma.AgencyWhereInput {
  const where: Prisma.AgencyWhereInput = {};

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { acronym: { contains: filters.search, mode: "insensitive" } },
      { code: { contains: filters.search } },
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

// Agency service interface
export interface AgencyService {
  listAgencies(
    filters: AgencyFilters,
    pagination: PaginationOptions,
    sort?: AgencySortOptions
  ): Promise<Result<PaginatedResponse<AgencyListItemDto>, ApiError>>;

  getAgencyById(id: string): Promise<Result<AgencyDetailDto, ApiError>>;
}

// Create agency service
export function createAgencyService(): AgencyService {
  return {
    async listAgencies(
      filters: AgencyFilters,
      pagination: PaginationOptions,
      sort?: AgencySortOptions
    ): Promise<Result<PaginatedResponse<AgencyListItemDto>, ApiError>> {
      try {
        const page = Math.max(DEFAULT_PAGE, pagination.page);
        const pageSize = Math.min(
          MAX_PAGE_SIZE,
          Math.max(1, pagination.pageSize)
        );
        const skip = (page - 1) * pageSize;

        const where = buildWhereClause(filters);

        // Get agencies with aggregated metrics
        const [agencies, total] = await Promise.all([
          prisma.agency.findMany({
            where,
            skip,
            take: pageSize,
            select: {
              id: true,
              code: true,
              name: true,
              acronym: true,
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
              sort?.field === "name" ? { name: sort.order } : { name: "asc" },
          }),
          prisma.agency.count({ where }),
        ]);

        // Calculate metrics for each agency
        const data: AgencyListItemDto[] = agencies.map((agency) => {
          const totalContracts = agency.contracts.length;
          const totalValue = agency.contracts.reduce(
            (sum, contract) => sum + Number(contract.value),
            0
          );
          const scoresWithValues = agency.contracts
            .map((c) => c.anomalyScore?.totalScore)
            .filter((score): score is number => score !== undefined);
          const averageScore =
            scoresWithValues.length > 0
              ? scoresWithValues.reduce((sum, score) => sum + score, 0) /
                scoresWithValues.length
              : null;

          return {
            id: agency.id,
            code: agency.code,
            name: agency.name,
            acronym: agency.acronym,
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
            message: "Failed to fetch agencies",
            details: error instanceof Error ? error.message : String(error),
          },
        };
      }
    },

    async getAgencyById(
      id: string
    ): Promise<Result<AgencyDetailDto, ApiError>> {
      try {
        const agency = await prisma.agency.findUnique({
          where: { id },
          select: {
            id: true,
            code: true,
            name: true,
            acronym: true,
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
              orderBy: { signatureDate: "desc" },
              take: DEFAULT_CONTRACTS_LIMIT,
            },
          },
        });

        if (!agency) {
          return {
            success: false,
            error: {
              code: "NOT_FOUND",
              message: `Agency with ID ${id} not found`,
            },
          };
        }

        // Calculate metrics
        const allContracts = await prisma.contract.findMany({
          where: { agencyId: id },
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

        const contracts: AgencyContractDto[] = agency.contracts.map(
          (contract) => ({
            id: contract.id,
            externalId: contract.externalId,
            number: contract.number,
            object: contract.object,
            value: Number(contract.value),
            category: contract.category,
            status: contract.status,
            signatureDate: contract.signatureDate,
            supplier: contract.supplier,
            anomalyScore: transformAnomalyScore(contract.anomalyScore),
          })
        );

        return {
          success: true,
          data: {
            id: agency.id,
            code: agency.code,
            name: agency.name,
            acronym: agency.acronym,
            metrics: {
              totalContracts,
              totalValue: Math.round(totalValue * 100) / 100,
              averageScore:
                averageScore !== null
                  ? Math.round(averageScore * 100) / 100
                  : null,
            },
            contracts,
            createdAt: agency.createdAt,
            updatedAt: agency.updatedAt,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: "DATABASE_ERROR",
            message: "Failed to fetch agency",
            details: error instanceof Error ? error.message : String(error),
          },
        };
      }
    },
  };
}
