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

// Supplier schema
const SupplierSchema = z.object({
  id: z.string(),
  cnpj: z.string(),
  tradeName: z.string(),
  legalName: z.string(),
});

// Agency metrics schema
const AgencyMetricsSchema = z.object({
  totalContracts: z.number().int().nonnegative(),
  totalValue: z.number().nonnegative(),
  averageScore: z.number().nullable(),
});

// Agency list item schema
const AgencyListItemSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  acronym: z.string().nullable(),
  metrics: AgencyMetricsSchema,
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

// Agency contract schema
const AgencyContractSchema = z.object({
  id: z.string(),
  externalId: z.string(),
  number: z.string(),
  object: z.string(),
  value: z.number(),
  category: ContractCategoryEnum,
  status: ContractStatusEnum,
  signatureDate: z.iso.datetime().nullable(),
  supplier: SupplierSchema,
  anomalyScore: AnomalyScoreSchema.nullable(),
});

// Agency detail schema
const AgencyDetailSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  acronym: z.string().nullable(),
  metrics: AgencyMetricsSchema,
  contracts: z.array(AgencyContractSchema),
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

// Paginated agencies response schema
const PaginatedAgenciesResponseSchema = z.object({
  data: z.array(AgencyListItemSchema),
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

// Query parameters for list agencies
const ListAgenciesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).openapi({ example: 1 }),
  pageSize: z.coerce
    .number()
    .int()
    .positive()
    .max(100)
    .default(20)
    .openapi({ example: 20 }),
  search: z.string().optional().openapi({
    example: "secretaria",
    description: "Search by name, acronym, or code",
  }),
  sortBy: z
    .enum(["name", "totalContracts", "totalValue"])
    .default("name")
    .openapi({ example: "name" }),
  order: z.enum(["asc", "desc"]).default("asc").openapi({ example: "asc" }),
});

// Path parameters for get agency by id
const AgencyIdParamSchema = z.object({
  id: z.string().openapi({ example: "clx789ghi" }),
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
