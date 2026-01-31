/**
 * Agencies API Routes with OpenAPI Documentation
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { createAgencyService } from "./service.js";
import type { AgencySortField, SortOrder } from "./types.js";

// Create service instance
const agencyService = createAgencyService();

// Create router
export const agenciesRouter = new OpenAPIHono();

// ============== Schemas ==============

// Score breakdown item schema
const ScoreBreakdownItemSchema = z
  .object({
    criterion: z
      .enum(["value", "amendment", "concentration", "duration"])
      .openapi({
        description: "Criterion being evaluated",
        example: "duration",
      }),
    score: z.number().int().min(0).max(25).openapi({
      description: "Score for this criterion (0-25)",
      example: 18,
    }),
    reason: z.string().nullable().openapi({
      description: "Explanation for the score",
      example: "Contract duration exceeds typical range for this category",
    }),
    isContributing: z.boolean().openapi({
      description: "Whether this criterion contributes significantly",
      example: true,
    }),
  })
  .openapi({ description: "Score breakdown by criterion" });

// Anomaly score schema
const AnomalyScoreSchema = z
  .object({
    totalScore: z.number().int().min(0).max(100).openapi({
      description: "Total anomaly score (0-100)",
      example: 55,
    }),
    category: z.enum(["LOW", "MEDIUM", "HIGH"]).openapi({
      description: "Risk category",
      example: "MEDIUM",
    }),
    breakdown: z.array(ScoreBreakdownItemSchema),
    calculatedAt: z.iso.datetime().openapi({
      description: "Calculation timestamp (ISO 8601)",
      example: "2024-06-15T10:30:00.000Z",
    }),
  })
  .openapi({ description: "Contract anomaly score" });

// Supplier schema
const SupplierSchema = z
  .object({
    id: z
      .string()
      .openapi({ description: "Supplier ID", example: "clx789def012" }),
    cnpj: z
      .string()
      .openapi({ description: "CNPJ", example: "12.345.678/0001-90" }),
    tradeName: z
      .string()
      .openapi({ description: "Trade name", example: "Tech Solutions" }),
    legalName: z
      .string()
      .openapi({ description: "Legal name", example: "Tech Solutions Ltda" }),
  })
  .openapi({ description: "Supplier summary" });

// Agency metrics schema
const AgencyMetricsSchema = z
  .object({
    totalContracts: z.number().int().nonnegative().openapi({
      description: "Total number of contracts",
      example: 250,
    }),
    totalValue: z.number().nonnegative().openapi({
      description: "Total contracted value in BRL",
      example: 500000000.0,
    }),
    averageScore: z.number().nullable().openapi({
      description: "Average anomaly score across all contracts",
      example: 28.5,
    }),
  })
  .openapi({ description: "Aggregated agency metrics" });

// Agency list item schema
const AgencyListItemSchema = z
  .object({
    id: z
      .string()
      .openapi({ description: "Agency ID", example: "clx123abc456" }),
    code: z
      .string()
      .openapi({ description: "Official code", example: "26246" }),
    name: z
      .string()
      .openapi({ description: "Full name", example: "Ministério da Saúde" }),
    acronym: z
      .string()
      .nullable()
      .openapi({ description: "Acronym", example: "MS" }),
    metrics: AgencyMetricsSchema,
  })
  .openapi({ description: "Agency summary for list views" });

// Contract category enum
const ContractCategoryEnum = z
  .enum(["OBRAS", "SERVICOS", "TI", "SAUDE", "EDUCACAO", "OUTROS"])
  .openapi({ description: "Contract category", example: "SAUDE" });

// Contract status enum
const ContractStatusEnum = z
  .enum(["ACTIVE", "COMPLETED", "CANCELLED", "SUSPENDED"])
  .openapi({ description: "Contract status", example: "ACTIVE" });

// Agency contract schema
const AgencyContractSchema = z
  .object({
    id: z
      .string()
      .openapi({ description: "Contract ID", example: "clx456ghi789" }),
    externalId: z
      .string()
      .openapi({ description: "External ID", example: "123456789" }),
    number: z
      .string()
      .openapi({ description: "Contract number", example: "CT-2024/0100" }),
    object: z.string().openapi({
      description: "Contract object",
      example: "Aquisição de equipamentos hospitalares",
    }),
    value: z
      .number()
      .openapi({ description: "Value in BRL", example: 2500000.0 }),
    category: ContractCategoryEnum,
    status: ContractStatusEnum,
    signatureDate: z.iso.datetime().nullable().openapi({
      description: "Signature date (ISO 8601)",
      example: "2024-05-10T00:00:00.000Z",
    }),
    supplier: SupplierSchema,
    anomalyScore: AnomalyScoreSchema.nullable(),
  })
  .openapi({ description: "Contract associated with the agency" });

// Agency detail schema
const AgencyDetailSchema = z
  .object({
    id: z
      .string()
      .openapi({ description: "Agency ID", example: "clx123abc456" }),
    code: z
      .string()
      .openapi({ description: "Official code", example: "26246" }),
    name: z
      .string()
      .openapi({ description: "Full name", example: "Ministério da Saúde" }),
    acronym: z
      .string()
      .nullable()
      .openapi({ description: "Acronym", example: "MS" }),
    metrics: AgencyMetricsSchema,
    contracts: z.array(AgencyContractSchema).openapi({
      description: "Recent contracts (up to 10)",
    }),
    createdAt: z.iso.datetime().openapi({
      description: "Record creation timestamp",
      example: "2024-01-05T09:00:00.000Z",
    }),
    updatedAt: z.iso.datetime().openapi({
      description: "Last update timestamp",
      example: "2024-06-15T10:30:00.000Z",
    }),
  })
  .openapi({ description: "Full agency details with contracts" });

// Pagination schema
const PaginationSchema = z
  .object({
    page: z
      .number()
      .int()
      .positive()
      .openapi({ description: "Current page", example: 1 }),
    pageSize: z
      .number()
      .int()
      .positive()
      .openapi({ description: "Items per page", example: 20 }),
    total: z
      .number()
      .int()
      .nonnegative()
      .openapi({ description: "Total items", example: 85 }),
    totalPages: z
      .number()
      .int()
      .nonnegative()
      .openapi({ description: "Total pages", example: 5 }),
  })
  .openapi({ description: "Pagination metadata" });

// Paginated agencies response schema
const PaginatedAgenciesResponseSchema = z
  .object({
    data: z.array(AgencyListItemSchema),
    pagination: PaginationSchema,
  })
  .openapi({ description: "Paginated list of agencies" });

// Error response schema
const ErrorResponseSchema = z
  .object({
    code: z
      .enum(["NOT_FOUND", "INVALID_PARAMS", "DATABASE_ERROR", "INTERNAL_ERROR"])
      .openapi({
        description: "Error code",
        example: "NOT_FOUND",
      }),
    message: z
      .string()
      .openapi({ description: "Error message", example: "Agency not found" }),
    details: z
      .unknown()
      .optional()
      .openapi({ description: "Additional details (dev mode only)" }),
  })
  .openapi({ description: "Error response" });

// Query parameters for list agencies
const ListAgenciesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).openapi({
    description: "Page number (1-indexed)",
    example: 1,
  }),
  pageSize: z.coerce.number().int().positive().max(100).default(20).openapi({
    description: "Items per page (max 100)",
    example: 20,
  }),
  search: z.string().optional().openapi({
    description: "Search by name, acronym, or code (partial match)",
    example: "saude",
  }),
  sortBy: z
    .enum(["name", "totalContracts", "totalValue"])
    .default("name")
    .openapi({
      description: "Sort field: name (default), totalContracts, or totalValue",
      example: "totalValue",
    }),
  order: z.enum(["asc", "desc"]).default("asc").openapi({
    description: "Sort order: asc (default) or desc",
    example: "desc",
  }),
});

// Path parameters for get agency by id
const AgencyIdParamSchema = z.object({
  id: z.string().openapi({
    description: "Agency unique identifier",
    example: "clx123abc456",
  }),
});

// ============== Routes ==============

// Route: GET /api/agencies
const listAgenciesRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Agencies"],
  summary: "List agencies",
  description:
    "Returns a paginated list of government agencies with aggregated metrics (total contracts, total value, average anomaly score)",
  request: {
    query: ListAgenciesQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: PaginatedAgenciesResponseSchema,
        },
      },
      description: "Successful response with paginated agencies",
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

agenciesRouter.openapi(listAgenciesRoute, async (c) => {
  const query = c.req.valid("query");

  const filters = {
    search: query.search ?? undefined,
  };

  const pagination = {
    page: query.page,
    pageSize: query.pageSize,
  };

  const sort = {
    field: query.sortBy as AgencySortField,
    order: query.order as SortOrder,
  };

  const result = await agencyService.listAgencies(filters, pagination, sort);

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

  return c.json(result.data, 200);
});

// Route: GET /api/agencies/:id
const getAgencyByIdRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Agencies"],
  summary: "Get agency by ID",
  description:
    "Returns detailed information about a specific government agency including their recent contracts and aggregated metrics",
  request: {
    params: AgencyIdParamSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: AgencyDetailSchema,
        },
      },
      description: "Successful response with agency details",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Agency not found",
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

agenciesRouter.openapi(getAgencyByIdRoute, async (c) => {
  const { id } = c.req.valid("param");

  const result = await agencyService.getAgencyById(id);

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
  const agency = result.data;
  const responseData = {
    id: agency.id,
    code: agency.code,
    name: agency.name,
    acronym: agency.acronym,
    metrics: agency.metrics,
    contracts: agency.contracts.map((contract) => ({
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
    createdAt: agency.createdAt.toISOString(),
    updatedAt: agency.updatedAt.toISOString(),
  };

  return c.json(responseData, 200);
});
