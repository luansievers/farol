/**
 * Suppliers API Routes with OpenAPI Documentation
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { createSupplierService } from "./service.js";
import type { SupplierSortField, SortOrder } from "./types.js";

// Create service instance
const supplierService = createSupplierService();

// Create router
export const suppliersRouter = new OpenAPIHono();

// ============== Schemas ==============

// Score breakdown item schema
const ScoreBreakdownItemSchema = z
  .object({
    criterion: z
      .enum([
        "value",
        "amendment",
        "concentration",
        "duration",
        "timing",
        "roundNumber",
        "fragmentation",
        "description",
      ])
      .openapi({
        description: "The criterion being evaluated",
        example: "concentration",
      }),
    score: z.number().int().min(0).max(25).openapi({
      description: "Score for this criterion (0-25)",
      example: 20,
    }),
    reason: z.string().nullable().openapi({
      description: "Explanation for the score",
      example: "Supplier has 80% of contracts with this agency",
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
    totalScore: z.number().int().min(0).max(200).openapi({
      description: "Total anomaly score (0-200). 8 criteria x 25 pts each",
      example: 45,
    }),
    category: z.enum(["LOW", "MEDIUM", "HIGH"]).openapi({
      description: "Risk category based on total score",
      example: "MEDIUM",
    }),
    breakdown: z.array(ScoreBreakdownItemSchema),
    calculatedAt: z.iso.datetime().openapi({
      description: "When the score was calculated (ISO 8601)",
      example: "2024-06-15T10:30:00.000Z",
    }),
  })
  .openapi({ description: "Contract anomaly score" });

// Agency schema
const AgencySchema = z
  .object({
    id: z
      .string()
      .openapi({ description: "Agency ID", example: "clx123abc456" }),
    code: z
      .string()
      .openapi({ description: "Official agency code", example: "26246" }),
    name: z
      .string()
      .openapi({ description: "Full name", example: "Ministério da Saúde" }),
    acronym: z
      .string()
      .nullable()
      .openapi({ description: "Acronym", example: "MS" }),
  })
  .openapi({ description: "Government agency summary" });

// Supplier metrics schema
const SupplierMetricsSchema = z
  .object({
    totalContracts: z.number().int().nonnegative().openapi({
      description: "Total number of contracts",
      example: 15,
    }),
    totalValue: z.number().nonnegative().openapi({
      description: "Total contracted value in BRL",
      example: 25000000.0,
    }),
    averageScore: z.number().nullable().openapi({
      description: "Average anomaly score across all contracts",
      example: 35.5,
    }),
  })
  .openapi({ description: "Aggregated supplier metrics" });

// Supplier list item schema
const SupplierListItemSchema = z
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
    metrics: SupplierMetricsSchema,
  })
  .openapi({ description: "Supplier summary for list views" });

// Contract category enum
const ContractCategoryEnum = z
  .enum(["OBRAS", "SERVICOS", "TI", "SAUDE", "EDUCACAO", "OUTROS"])
  .openapi({ description: "Contract category", example: "TI" });

// Contract status enum
const ContractStatusEnum = z
  .enum(["ACTIVE", "COMPLETED", "CANCELLED", "SUSPENDED"])
  .openapi({ description: "Contract status", example: "ACTIVE" });

// Supplier contract schema
const SupplierContractSchema = z
  .object({
    id: z
      .string()
      .openapi({ description: "Contract ID", example: "clx456ghi789" }),
    externalId: z
      .string()
      .openapi({ description: "External ID", example: "123456789" }),
    number: z
      .string()
      .openapi({ description: "Contract number", example: "CT-2024/0001" }),
    object: z.string().openapi({
      description: "Contract object",
      example: "Desenvolvimento de sistema de gestão",
    }),
    value: z
      .number()
      .openapi({ description: "Value in BRL", example: 500000.0 }),
    category: ContractCategoryEnum,
    status: ContractStatusEnum,
    signatureDate: z.iso.datetime().nullable().openapi({
      description: "Signature date (ISO 8601)",
      example: "2024-03-15T00:00:00.000Z",
    }),
    agency: AgencySchema,
    anomalyScore: AnomalyScoreSchema.nullable(),
  })
  .openapi({ description: "Contract associated with the supplier" });

// Supplier detail schema
const SupplierDetailSchema = z
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
    metrics: SupplierMetricsSchema,
    contracts: z.array(SupplierContractSchema).openapi({
      description: "Recent contracts (up to 10)",
    }),
    createdAt: z.iso.datetime().openapi({
      description: "Record creation timestamp",
      example: "2024-01-10T09:00:00.000Z",
    }),
    updatedAt: z.iso.datetime().openapi({
      description: "Last update timestamp",
      example: "2024-06-15T10:30:00.000Z",
    }),
  })
  .openapi({ description: "Full supplier details with contracts" });

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
      .openapi({ description: "Total items", example: 150 }),
    totalPages: z
      .number()
      .int()
      .nonnegative()
      .openapi({ description: "Total pages", example: 8 }),
  })
  .openapi({ description: "Pagination metadata" });

// Paginated suppliers response schema
const PaginatedSuppliersResponseSchema = z
  .object({
    data: z.array(SupplierListItemSchema),
    pagination: PaginationSchema,
  })
  .openapi({ description: "Paginated list of suppliers" });

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
      .openapi({ description: "Error message", example: "Supplier not found" }),
    details: z
      .unknown()
      .optional()
      .openapi({ description: "Additional details (dev mode only)" }),
  })
  .openapi({ description: "Error response" });

// Query parameters for list suppliers
const ListSuppliersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).openapi({
    description: "Page number (1-indexed)",
    example: 1,
  }),
  pageSize: z.coerce.number().int().positive().max(100).default(20).openapi({
    description: "Items per page (max 100)",
    example: 20,
  }),
  search: z.string().optional().openapi({
    description: "Search by trade name, legal name, or CNPJ (partial match)",
    example: "tech",
  }),
  sortBy: z
    .enum(["tradeName", "totalContracts", "totalValue"])
    .default("tradeName")
    .openapi({
      description:
        "Sort field: tradeName (default), totalContracts, or totalValue",
      example: "totalValue",
    }),
  order: z.enum(["asc", "desc"]).default("asc").openapi({
    description: "Sort order: asc (default) or desc",
    example: "desc",
  }),
});

// Path parameters for get supplier by id
const SupplierIdParamSchema = z.object({
  id: z.string().openapi({
    description: "Supplier unique identifier",
    example: "clx789def012",
  }),
});

// ============== Routes ==============

// Route: GET /api/suppliers
const listSuppliersRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Suppliers"],
  summary: "List suppliers",
  description:
    "Returns a paginated list of suppliers with aggregated metrics (total contracts, total value, average anomaly score)",
  request: {
    query: ListSuppliersQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: PaginatedSuppliersResponseSchema,
        },
      },
      description: "Successful response with paginated suppliers",
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

suppliersRouter.openapi(listSuppliersRoute, async (c) => {
  const query = c.req.valid("query");

  const filters = {
    search: query.search ?? undefined,
  };

  const pagination = {
    page: query.page,
    pageSize: query.pageSize,
  };

  const sort = {
    field: query.sortBy as SupplierSortField,
    order: query.order as SortOrder,
  };

  const result = await supplierService.listSuppliers(filters, pagination, sort);

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

// Route: GET /api/suppliers/:id
const getSupplierByIdRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Suppliers"],
  summary: "Get supplier by ID",
  description:
    "Returns detailed information about a specific supplier including their recent contracts and aggregated metrics",
  request: {
    params: SupplierIdParamSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: SupplierDetailSchema,
        },
      },
      description: "Successful response with supplier details",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Supplier not found",
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

suppliersRouter.openapi(getSupplierByIdRoute, async (c) => {
  const { id } = c.req.valid("param");

  const result = await supplierService.getSupplierById(id);

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
  const supplier = result.data;
  const responseData = {
    id: supplier.id,
    cnpj: supplier.cnpj,
    tradeName: supplier.tradeName,
    legalName: supplier.legalName,
    metrics: supplier.metrics,
    contracts: supplier.contracts.map((contract) => ({
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
      anomalyScore: contract.anomalyScore
        ? {
            totalScore: contract.anomalyScore.totalScore,
            category: contract.anomalyScore.category,
            breakdown: contract.anomalyScore.breakdown,
            calculatedAt: contract.anomalyScore.calculatedAt.toISOString(),
          }
        : null,
    })),
    createdAt: supplier.createdAt.toISOString(),
    updatedAt: supplier.updatedAt.toISOString(),
  };

  return c.json(responseData, 200);
});
