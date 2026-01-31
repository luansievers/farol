/**
 * Search API Routes with OpenAPI Documentation
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { createSearchService } from "./service.js";
import type { SearchResultType } from "./types.js";

// Create service instance
const searchService = createSearchService();

// Create router
export const searchRouter = new OpenAPIHono();

// ============== Schemas ==============

// Search result type enum (used in OpenAPI schema validation)
const _SearchResultTypeEnum = z.enum(["contract", "supplier", "agency"]);
void _SearchResultTypeEnum; // Referenced for OpenAPI docs

// Contract search result schema
const ContractSearchResultSchema = z.object({
  id: z.string(),
  type: z.literal("contract"),
  label: z.string(),
  sublabel: z.string(),
  value: z.number(),
  category: z.string(),
  anomalyScore: z.number().nullable(),
});

// Supplier search result schema
const SupplierSearchResultSchema = z.object({
  id: z.string(),
  type: z.literal("supplier"),
  label: z.string(),
  sublabel: z.string(),
  cnpj: z.string(),
  totalContracts: z.number().int(),
  totalValue: z.number(),
});

// Agency search result schema
const AgencySearchResultSchema = z.object({
  id: z.string(),
  type: z.literal("agency"),
  label: z.string(),
  sublabel: z.string(),
  code: z.string(),
  totalContracts: z.number().int(),
  totalValue: z.number(),
});

// Grouped search results schema
const GroupedSearchResultsSchema = z.object({
  contracts: z.array(ContractSearchResultSchema),
  suppliers: z.array(SupplierSearchResultSchema),
  agencies: z.array(AgencySearchResultSchema),
  totalCount: z.number().int(),
});

// Full search results schema
const FullSearchResultsSchema = z.object({
  contracts: z.object({
    items: z.array(ContractSearchResultSchema),
    total: z.number().int(),
  }),
  suppliers: z.object({
    items: z.array(SupplierSearchResultSchema),
    total: z.number().int(),
  }),
  agencies: z.object({
    items: z.array(AgencySearchResultSchema),
    total: z.number().int(),
  }),
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

// Query parameters for autocomplete
const AutocompleteQuerySchema = z.object({
  q: z.string().min(2).openapi({
    example: "limpeza",
    description: "Search query (min 2 characters)",
  }),
  types: z.string().optional().openapi({
    example: "contract,supplier",
    description:
      "Comma-separated list of types to include: contract, supplier, agency",
  }),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(10)
    .default(5)
    .openapi({ example: 5 }),
});

// Query parameters for full search
const FullSearchQuerySchema = z.object({
  q: z.string().min(2).openapi({
    example: "limpeza",
    description: "Search query (min 2 characters)",
  }),
  types: z.string().optional().openapi({
    example: "contract,supplier",
    description:
      "Comma-separated list of types to include: contract, supplier, agency",
  }),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(50)
    .default(20)
    .openapi({ example: 20 }),
});

// ============== Routes ==============

// Route: GET /api/search/autocomplete
const autocompleteRoute = createRoute({
  method: "get",
  path: "/autocomplete",
  tags: ["Search"],
  summary: "Autocomplete search",
  description:
    "Returns quick search suggestions for contracts, suppliers, and agencies",
  request: {
    query: AutocompleteQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: GroupedSearchResultsSchema,
        },
      },
      description: "Successful response with grouped search suggestions",
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Invalid query parameters",
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

searchRouter.openapi(autocompleteRoute, async (c) => {
  const query = c.req.valid("query");

  const types = query.types
    ? (query.types
        .split(",")
        .filter((t) =>
          ["contract", "supplier", "agency"].includes(t)
        ) as SearchResultType[])
    : undefined;

  const result = await searchService.autocomplete({
    query: query.q,
    ...(types && { types }),
    limit: query.limit,
  });

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

// Route: GET /api/search
const fullSearchRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Search"],
  summary: "Full search",
  description:
    "Returns comprehensive search results for contracts, suppliers, and agencies with totals",
  request: {
    query: FullSearchQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: FullSearchResultsSchema,
        },
      },
      description: "Successful response with full search results",
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Invalid query parameters",
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

searchRouter.openapi(fullSearchRoute, async (c) => {
  const query = c.req.valid("query");

  const types = query.types
    ? (query.types
        .split(",")
        .filter((t) =>
          ["contract", "supplier", "agency"].includes(t)
        ) as SearchResultType[])
    : undefined;

  const result = await searchService.fullSearch({
    query: query.q,
    ...(types && { types }),
    limit: query.limit,
  });

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
