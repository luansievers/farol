/**
 * Contracts API Routes with OpenAPI Documentation
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { createContractService } from "./service.js";
import type { ContractSortField, SortOrder } from "./types.js";

// Create service instance
const contractService = createContractService();

// Create router
export const contractsRouter = new OpenAPIHono();

// ============== Schemas ==============

// Score breakdown item schema
const ScoreBreakdownItemSchema = z.object({
  criterion: z.enum(["value", "amendment", "concentration", "duration"]),
  score: z.number().int().min(0).max(25),
  reason: z.string().nullable(),
  isContributing: z.boolean(),
});

// Anomaly score schema
const AnomalyScoreSchema = z.object({
  totalScore: z.number().int().min(0).max(100),
  category: z.enum(["LOW", "MEDIUM", "HIGH"]),
  breakdown: z.array(ScoreBreakdownItemSchema),
  calculatedAt: z.iso.datetime(),
});

// Agency schema
const AgencySchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  acronym: z.string().nullable(),
});

// Supplier schema
const SupplierSchema = z.object({
  id: z.string(),
  cnpj: z.string(),
  tradeName: z.string(),
  legalName: z.string(),
});

// Contract category enum
const ContractCategoryEnum = z.enum([
  "OBRAS",
  "SERVICOS",
  "TI",
  "SAUDE",
  "EDUCACAO",
  "OUTROS",
]);

// Contract status enum
const ContractStatusEnum = z.enum([
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
  "SUSPENDED",
]);

// Contract list item schema
const ContractListItemSchema = z.object({
  id: z.string(),
  externalId: z.string(),
  number: z.string(),
  object: z.string(),
  value: z.number(),
  category: ContractCategoryEnum,
  status: ContractStatusEnum,
  signatureDate: z.iso.datetime().nullable(),
  agency: AgencySchema,
  supplier: SupplierSchema,
  anomalyScore: AnomalyScoreSchema.nullable(),
});

// Contract detail schema (extends list item)
const ContractDetailSchema = ContractListItemSchema.extend({
  modalidade: z.string().nullable(),
  startDate: z.iso.datetime().nullable(),
  endDate: z.iso.datetime().nullable(),
  publicationDate: z.iso.datetime().nullable(),
  summary: z.string().nullable(),
  summaryGeneratedAt: z.iso.datetime().nullable(),
  amendmentCount: z.number().int(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

// Pagination schema
const PaginationSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

// Paginated contracts response schema
const PaginatedContractsResponseSchema = z.object({
  data: z.array(ContractListItemSchema),
  pagination: PaginationSchema,
});

// Error response schema
const ErrorResponseSchema = z.object({
  code: z.enum([
    "NOT_FOUND",
    "INVALID_PARAMS",
    "DATABASE_ERROR",
    "INTERNAL_ERROR",
  ]),
  message: z.string(),
  details: z.unknown().optional(),
});

// Query parameters for list contracts
const ListContractsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).openapi({ example: 1 }),
  pageSize: z.coerce
    .number()
    .int()
    .positive()
    .max(100)
    .default(20)
    .openapi({ example: 20 }),
  category: ContractCategoryEnum.optional().openapi({ example: "OBRAS" }),
  agencyId: z.string().optional().openapi({ example: "clx123abc" }),
  supplierId: z.string().optional().openapi({ example: "clx456def" }),
  startDate: z.iso
    .datetime()
    .optional()
    .openapi({ example: "2024-01-01T00:00:00.000Z" }),
  endDate: z.iso
    .datetime()
    .optional()
    .openapi({ example: "2024-12-31T23:59:59.999Z" }),
  minScore: z.coerce
    .number()
    .int()
    .min(0)
    .max(100)
    .optional()
    .openapi({ example: 50 }),
  sortBy: z
    .enum(["signatureDate", "value", "totalScore"])
    .default("signatureDate")
    .openapi({ example: "signatureDate" }),
  order: z.enum(["asc", "desc"]).default("desc").openapi({ example: "desc" }),
});

// Path parameters for get contract by id
const ContractIdParamSchema = z.object({
  id: z.string().openapi({ example: "clx789ghi" }),
});

// ============== Routes ==============

// Route: GET /api/contracts
const listContractsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Contracts"],
  summary: "List contracts",
  description:
    "Returns a paginated list of contracts with optional filters and sorting",
  request: {
    query: ListContractsQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: PaginatedContractsResponseSchema,
        },
      },
      description: "Successful response with paginated contracts",
    },
    500: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Internal server error",
    },
  },
});

contractsRouter.openapi(listContractsRoute, async (c) => {
  const query = c.req.valid("query");

  const filters = {
    category: query.category ?? undefined,
    agencyId: query.agencyId ?? undefined,
    supplierId: query.supplierId ?? undefined,
    startDate: query.startDate ? new Date(query.startDate) : undefined,
    endDate: query.endDate ? new Date(query.endDate) : undefined,
    minScore: query.minScore ?? undefined,
  };

  const pagination = {
    page: query.page,
    pageSize: query.pageSize,
  };

  const sort = {
    field: query.sortBy as ContractSortField,
    order: query.order as SortOrder,
  };

  const result = await contractService.listContracts(filters, pagination, sort);

  if (!result.success) {
    return c.json(
      {
        code: result.error.code as
          | "NOT_FOUND"
          | "INVALID_PARAMS"
          | "DATABASE_ERROR"
          | "INTERNAL_ERROR",
        message: result.error.message,
        details: result.error.details,
      },
      500
    );
  }

  // Transform dates to ISO strings for JSON serialization
  const responseData = {
    data: result.data.data.map((contract) => ({
      id: contract.id,
      externalId: contract.externalId,
      number: contract.number,
      object: contract.object,
      value: contract.value,
      category: contract.category as
        | "OBRAS"
        | "SERVICOS"
        | "TI"
        | "SAUDE"
        | "EDUCACAO"
        | "OUTROS",
      status: contract.status as
        | "ACTIVE"
        | "COMPLETED"
        | "CANCELLED"
        | "SUSPENDED",
      signatureDate: contract.signatureDate?.toISOString() ?? null,
      agency: contract.agency,
      supplier: contract.supplier,
      anomalyScore: contract.anomalyScore
        ? {
            totalScore: contract.anomalyScore.totalScore,
            category: contract.anomalyScore.category,
            breakdown: contract.anomalyScore.breakdown,
            calculatedAt: contract.anomalyScore.calculatedAt.toISOString(),
          }
        : null,
    })),
    pagination: result.data.pagination,
  };

  return c.json(responseData, 200);
});

// Route: GET /api/contracts/:id
const getContractByIdRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Contracts"],
  summary: "Get contract by ID",
  description:
    "Returns detailed information about a specific contract including AI summary and anomaly score breakdown",
  request: {
    params: ContractIdParamSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ContractDetailSchema,
        },
      },
      description: "Successful response with contract details",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Contract not found",
    },
    500: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Internal server error",
    },
  },
});

contractsRouter.openapi(getContractByIdRoute, async (c) => {
  const { id } = c.req.valid("param");

  const result = await contractService.getContractById(id);

  if (!result.success) {
    const status = result.error.code === "NOT_FOUND" ? 404 : 500;
    return c.json(
      {
        code: result.error.code as
          | "NOT_FOUND"
          | "INVALID_PARAMS"
          | "DATABASE_ERROR"
          | "INTERNAL_ERROR",
        message: result.error.message,
        details: result.error.details,
      },
      status
    );
  }

  // Transform dates to ISO strings for JSON serialization
  const contract = result.data;
  const responseData = {
    id: contract.id,
    externalId: contract.externalId,
    number: contract.number,
    object: contract.object,
    value: contract.value,
    category: contract.category as
      | "OBRAS"
      | "SERVICOS"
      | "TI"
      | "SAUDE"
      | "EDUCACAO"
      | "OUTROS",
    status: contract.status as
      | "ACTIVE"
      | "COMPLETED"
      | "CANCELLED"
      | "SUSPENDED",
    modalidade: contract.modalidade,
    signatureDate: contract.signatureDate?.toISOString() ?? null,
    startDate: contract.startDate?.toISOString() ?? null,
    endDate: contract.endDate?.toISOString() ?? null,
    publicationDate: contract.publicationDate?.toISOString() ?? null,
    summary: contract.summary,
    summaryGeneratedAt: contract.summaryGeneratedAt?.toISOString() ?? null,
    amendmentCount: contract.amendmentCount,
    createdAt: contract.createdAt.toISOString(),
    updatedAt: contract.updatedAt.toISOString(),
    agency: contract.agency,
    supplier: contract.supplier,
    anomalyScore: contract.anomalyScore
      ? {
          totalScore: contract.anomalyScore.totalScore,
          category: contract.anomalyScore.category,
          breakdown: contract.anomalyScore.breakdown,
          calculatedAt: contract.anomalyScore.calculatedAt.toISOString(),
        }
      : null,
  };

  return c.json(responseData, 200);
});

// ============== Similar Contracts Schemas ==============

// Similar contract item schema (simplified for comparison)
const SimilarContractSchema = z.object({
  id: z.string(),
  externalId: z.string(),
  number: z.string(),
  object: z.string(),
  value: z.number(),
  signatureDate: z.iso.datetime().nullable(),
  agency: AgencySchema,
  supplier: SupplierSchema,
  anomalyScore: AnomalyScoreSchema.nullable(),
});

// Category statistics schema
const CategoryStatisticsSchema = z.object({
  count: z.number().int().nonnegative(),
  average: z.number(),
  median: z.number(),
  min: z.number(),
  max: z.number(),
  standardDeviation: z.number(),
});

// Reference contract schema
const ReferenceContractSchema = z.object({
  id: z.string(),
  value: z.number(),
  category: ContractCategoryEnum,
});

// Similar contracts response schema
const SimilarContractsResponseSchema = z.object({
  referenceContract: ReferenceContractSchema,
  similarContracts: z.array(SimilarContractSchema),
  statistics: CategoryStatisticsSchema,
});

// Query parameters for similar contracts
const SimilarContractsQuerySchema = z.object({
  startDate: z.iso.datetime().optional().openapi({
    example: "2024-01-01T00:00:00.000Z",
    description: "Filter similar contracts from this date",
  }),
  endDate: z.iso.datetime().optional().openapi({
    example: "2024-12-31T23:59:59.999Z",
    description: "Filter similar contracts until this date",
  }),
});

// Route: GET /api/contracts/:id/similar
const getSimilarContractsRoute = createRoute({
  method: "get",
  path: "/{id}/similar",
  tags: ["Contracts"],
  summary: "Get similar contracts",
  description:
    "Returns contracts in the same category as the reference contract, with statistical comparison (average, median, min, max). Useful for benchmarking contract values.",
  request: {
    params: ContractIdParamSchema,
    query: SimilarContractsQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: SimilarContractsResponseSchema,
        },
      },
      description:
        "Successful response with similar contracts and category statistics",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Reference contract not found",
    },
    500: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Internal server error",
    },
  },
});

contractsRouter.openapi(getSimilarContractsRoute, async (c) => {
  const { id } = c.req.valid("param");
  const query = c.req.valid("query");

  const filters = {
    startDate: query.startDate ? new Date(query.startDate) : undefined,
    endDate: query.endDate ? new Date(query.endDate) : undefined,
  };

  const result = await contractService.getSimilarContracts(id, filters);

  if (!result.success) {
    const status = result.error.code === "NOT_FOUND" ? 404 : 500;
    return c.json(
      {
        code: result.error.code as
          | "NOT_FOUND"
          | "INVALID_PARAMS"
          | "DATABASE_ERROR"
          | "INTERNAL_ERROR",
        message: result.error.message,
        details: result.error.details,
      },
      status
    );
  }

  // Transform dates to ISO strings for JSON serialization
  const data = result.data;
  const responseData = {
    referenceContract: {
      id: data.referenceContract.id,
      value: data.referenceContract.value,
      category: data.referenceContract.category as
        | "OBRAS"
        | "SERVICOS"
        | "TI"
        | "SAUDE"
        | "EDUCACAO"
        | "OUTROS",
    },
    similarContracts: data.similarContracts.map((contract) => ({
      id: contract.id,
      externalId: contract.externalId,
      number: contract.number,
      object: contract.object,
      value: contract.value,
      signatureDate: contract.signatureDate?.toISOString() ?? null,
      agency: contract.agency,
      supplier: contract.supplier,
      anomalyScore: contract.anomalyScore
        ? {
            totalScore: contract.anomalyScore.totalScore,
            category: contract.anomalyScore.category,
            breakdown: contract.anomalyScore.breakdown,
            calculatedAt: contract.anomalyScore.calculatedAt.toISOString(),
          }
        : null,
    })),
    statistics: data.statistics,
  };

  return c.json(responseData, 200);
});
