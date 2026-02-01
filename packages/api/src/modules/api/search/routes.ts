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
const _SearchResultTypeEnum = z
  .enum(["contract", "supplier", "agency"])
  .openapi({
    description: "Type of search result",
    example: "contract",
  });
void _SearchResultTypeEnum; // Referenced for OpenAPI docs

// Contract search result schema
const ContractSearchResultSchema = z
  .object({
    id: z
      .string()
      .openapi({ description: "Contract ID", example: "clx456ghi789" }),
    type: z
      .literal("contract")
      .openapi({ description: "Result type", example: "contract" }),
    label: z.string().openapi({
      description: "Primary display text (contract object)",
      example: "Prestação de serviços de limpeza",
    }),
    sublabel: z.string().openapi({
      description: "Secondary display text (agency name)",
      example: "Ministério da Saúde",
    }),
    value: z
      .number()
      .openapi({ description: "Contract value in BRL", example: 1500000.0 }),
    category: z
      .string()
      .openapi({ description: "Contract category", example: "SERVICOS" }),
    anomalyScore: z.number().nullable().openapi({
      description: "Anomaly score (0-100) if available",
      example: 45,
    }),
  })
  .openapi({ description: "Contract search result" });

// Supplier search result schema
const SupplierSearchResultSchema = z
  .object({
    id: z
      .string()
      .openapi({ description: "Supplier ID", example: "clx789def012" }),
    type: z
      .literal("supplier")
      .openapi({ description: "Result type", example: "supplier" }),
    label: z.string().openapi({
      description: "Primary display text (trade name)",
      example: "Tech Solutions",
    }),
    sublabel: z.string().openapi({
      description: "Secondary display text (legal name)",
      example: "Tech Solutions Ltda",
    }),
    cnpj: z
      .string()
      .openapi({ description: "CNPJ", example: "12.345.678/0001-90" }),
    totalContracts: z.number().int().openapi({
      description: "Total number of contracts",
      example: 15,
    }),
    totalValue: z.number().openapi({
      description: "Total contracted value in BRL",
      example: 25000000.0,
    }),
  })
  .openapi({ description: "Supplier search result" });

// Agency search result schema
const AgencySearchResultSchema = z
  .object({
    id: z
      .string()
      .openapi({ description: "Agency ID", example: "clx123abc456" }),
    type: z
      .literal("agency")
      .openapi({ description: "Result type", example: "agency" }),
    label: z.string().openapi({
      description: "Primary display text (agency name)",
      example: "Ministério da Saúde",
    }),
    sublabel: z.string().openapi({
      description: "Secondary display text (acronym or code)",
      example: "MS",
    }),
    code: z
      .string()
      .openapi({ description: "Official agency code", example: "26246" }),
    totalContracts: z.number().int().openapi({
      description: "Total number of contracts",
      example: 250,
    }),
    totalValue: z.number().openapi({
      description: "Total contracted value in BRL",
      example: 500000000.0,
    }),
  })
  .openapi({ description: "Agency search result" });

// Grouped search results schema
const GroupedSearchResultsSchema = z
  .object({
    contracts: z.array(ContractSearchResultSchema).openapi({
      description: "Matching contracts",
    }),
    suppliers: z.array(SupplierSearchResultSchema).openapi({
      description: "Matching suppliers",
    }),
    agencies: z.array(AgencySearchResultSchema).openapi({
      description: "Matching agencies",
    }),
    totalCount: z.number().int().openapi({
      description: "Total number of results across all types",
      example: 12,
    }),
  })
  .openapi({
    description: "Grouped autocomplete results for quick suggestions",
  });

// Full search results schema
const FullSearchResultsSchema = z
  .object({
    contracts: z
      .object({
        items: z.array(ContractSearchResultSchema),
        total: z.number().int().openapi({
          description: "Total matching contracts (may exceed returned items)",
          example: 45,
        }),
      })
      .openapi({ description: "Contract results with total count" }),
    suppliers: z
      .object({
        items: z.array(SupplierSearchResultSchema),
        total: z.number().int().openapi({
          description: "Total matching suppliers (may exceed returned items)",
          example: 8,
        }),
      })
      .openapi({ description: "Supplier results with total count" }),
    agencies: z
      .object({
        items: z.array(AgencySearchResultSchema),
        total: z.number().int().openapi({
          description: "Total matching agencies (may exceed returned items)",
          example: 3,
        }),
      })
      .openapi({ description: "Agency results with total count" }),
  })
  .openapi({ description: "Full search results with totals for each type" });

// Error response schema
const ErrorResponseSchema = z
  .object({
    code: z
      .enum(["NOT_FOUND", "INVALID_PARAMS", "DATABASE_ERROR", "INTERNAL_ERROR"])
      .openapi({
        description: "Error code",
        example: "INVALID_PARAMS",
      }),
    message: z.string().openapi({
      description: "Error message",
      example: "Search query must be at least 2 characters",
    }),
    details: z.unknown().optional().openapi({
      description: "Additional details (dev mode only)",
    }),
  })
  .openapi({ description: "Error response" });

// Query parameters for autocomplete
const AutocompleteQuerySchema = z.object({
  q: z.string().min(2).openapi({
    description:
      "Search query (minimum 2 characters). Searches across contract objects, supplier names/CNPJs, and agency names/codes.",
    example: "limpeza",
  }),
  types: z.string().optional().openapi({
    description:
      "Comma-separated list of types to include. Options: contract, supplier, agency. Defaults to all types.",
    example: "contract,supplier",
  }),
  limit: z.coerce.number().int().positive().max(10).default(5).openapi({
    description: "Maximum results per type (max 10)",
    example: 5,
  }),
});

// Query parameters for full search
const FullSearchQuerySchema = z.object({
  q: z.string().min(2).openapi({
    description:
      "Search query (minimum 2 characters). Searches across contract objects, supplier names/CNPJs, and agency names/codes.",
    example: "construção escola",
  }),
  types: z.string().optional().openapi({
    description:
      "Comma-separated list of types to include. Options: contract, supplier, agency. Defaults to all types.",
    example: "contract",
  }),
  limit: z.coerce.number().int().positive().max(50).default(20).openapi({
    description: "Maximum results per type (max 50)",
    example: 20,
  }),
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
