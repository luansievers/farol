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

// Supplier metrics schema
const SupplierMetricsSchema = z.object({
  totalContracts: z.number().int().nonnegative(),
  totalValue: z.number().nonnegative(),
  averageScore: z.number().nullable(),
});

// Supplier list item schema
const SupplierListItemSchema = z.object({
  id: z.string(),
  cnpj: z.string(),
  tradeName: z.string(),
  legalName: z.string(),
  metrics: SupplierMetricsSchema,
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

// Supplier contract schema
const SupplierContractSchema = z.object({
  id: z.string(),
  externalId: z.string(),
  number: z.string(),
  object: z.string(),
  value: z.number(),
  category: ContractCategoryEnum,
  status: ContractStatusEnum,
  signatureDate: z.iso.datetime().nullable(),
  agency: AgencySchema,
  anomalyScore: AnomalyScoreSchema.nullable(),
});

// Supplier detail schema
const SupplierDetailSchema = z.object({
  id: z.string(),
  cnpj: z.string(),
  tradeName: z.string(),
  legalName: z.string(),
  metrics: SupplierMetricsSchema,
  contracts: z.array(SupplierContractSchema),
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

// Paginated suppliers response schema
const PaginatedSuppliersResponseSchema = z.object({
  data: z.array(SupplierListItemSchema),
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

// Query parameters for list suppliers
const ListSuppliersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).openapi({ example: 1 }),
  pageSize: z.coerce
    .number()
    .int()
    .positive()
    .max(100)
    .default(20)
    .openapi({ example: 20 }),
  search: z.string().optional().openapi({
    example: "empresa",
    description: "Search by trade name, legal name, or CNPJ",
  }),
  sortBy: z
    .enum(["tradeName", "totalContracts", "totalValue"])
    .default("tradeName")
    .openapi({ example: "tradeName" }),
  order: z.enum(["asc", "desc"]).default("asc").openapi({ example: "asc" }),
});

// Path parameters for get supplier by id
const SupplierIdParamSchema = z.object({
  id: z.string().openapi({ example: "clx789ghi" }),
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
