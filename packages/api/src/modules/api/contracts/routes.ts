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
const ScoreBreakdownItemSchema = z
  .object({
    criterion: z
      .enum(["value", "amendment", "concentration", "duration"])
      .openapi({
        description: "The criterion being evaluated",
        example: "value",
      }),
    score: z.number().int().min(0).max(25).openapi({
      description: "Score for this criterion (0-25)",
      example: 15,
    }),
    reason: z.string().nullable().openapi({
      description: "Explanation for the score",
      example: "Contract value is 2.5x above category average",
    }),
    isContributing: z.boolean().openapi({
      description:
        "Whether this criterion contributes significantly to the total score",
      example: true,
    }),
  })
  .openapi({
    description: "Individual criterion breakdown within the anomaly score",
  });

// Anomaly score schema
const AnomalyScoreSchema = z
  .object({
    totalScore: z.number().int().min(0).max(100).openapi({
      description: "Total anomaly score (0-100). Higher = more anomalous",
      example: 65,
    }),
    category: z.enum(["LOW", "MEDIUM", "HIGH"]).openapi({
      description: "Risk category: LOW (0-33), MEDIUM (34-66), HIGH (67-100)",
      example: "MEDIUM",
    }),
    breakdown: z.array(ScoreBreakdownItemSchema).openapi({
      description:
        "Detailed breakdown by criterion (4 items, 25 points each max)",
    }),
    calculatedAt: z.iso.datetime().openapi({
      description: "When the score was calculated (ISO 8601)",
      example: "2024-06-15T10:30:00.000Z",
    }),
  })
  .openapi({
    description:
      "AI-generated anomaly score indicating potential irregularities",
  });

// Agency schema
const AgencySchema = z
  .object({
    id: z.string().openapi({
      description: "Unique agency identifier",
      example: "clx123abc456",
    }),
    code: z.string().openapi({
      description: "Official agency code",
      example: "26246",
    }),
    name: z.string().openapi({
      description: "Full agency name",
      example: "Ministério da Saúde",
    }),
    acronym: z.string().nullable().openapi({
      description: "Agency acronym if available",
      example: "MS",
    }),
  })
  .openapi({ description: "Government agency summary" });

// Supplier schema
const SupplierSchema = z
  .object({
    id: z.string().openapi({
      description: "Unique supplier identifier",
      example: "clx789def012",
    }),
    cnpj: z.string().openapi({
      description: "Brazilian company registration number (CNPJ)",
      example: "12.345.678/0001-90",
    }),
    tradeName: z.string().openapi({
      description: "Trade name (nome fantasia)",
      example: "Tech Solutions",
    }),
    legalName: z.string().openapi({
      description: "Legal name (razão social)",
      example: "Tech Solutions Ltda",
    }),
  })
  .openapi({ description: "Supplier/contractor summary" });

// Contract category enum
const ContractCategoryEnum = z
  .enum(["OBRAS", "SERVICOS", "TI", "SAUDE", "EDUCACAO", "OUTROS"])
  .openapi({
    description:
      "Contract category: OBRAS (construction), SERVICOS (services), TI (IT), SAUDE (health), EDUCACAO (education), OUTROS (other)",
    example: "SERVICOS",
  });

// Contract status enum
const ContractStatusEnum = z
  .enum(["ACTIVE", "COMPLETED", "CANCELLED", "SUSPENDED"])
  .openapi({
    description: "Current contract status",
    example: "ACTIVE",
  });

// Contract list item schema
const ContractListItemSchema = z
  .object({
    id: z.string().openapi({
      description: "Unique contract identifier",
      example: "clx456ghi789",
    }),
    externalId: z.string().openapi({
      description: "External ID from source system",
      example: "123456789",
    }),
    number: z.string().openapi({
      description: "Contract number",
      example: "CT-2024/0001",
    }),
    object: z.string().openapi({
      description: "Contract object/description",
      example: "Prestação de serviços de limpeza e conservação predial",
    }),
    value: z.number().openapi({
      description: "Contract value in BRL",
      example: 1500000.0,
    }),
    category: ContractCategoryEnum,
    status: ContractStatusEnum,
    signatureDate: z.iso.datetime().nullable().openapi({
      description: "Contract signature date (ISO 8601)",
      example: "2024-03-15T00:00:00.000Z",
    }),
    agency: AgencySchema,
    supplier: SupplierSchema,
    anomalyScore: AnomalyScoreSchema.nullable(),
  })
  .openapi({ description: "Contract summary for list views" });

// Contract detail schema (extends list item)
const ContractDetailSchema = ContractListItemSchema.extend({
  modalidade: z.string().nullable().openapi({
    description: "Procurement modality (e.g., Pregão, Concorrência)",
    example: "Pregão Eletrônico",
  }),
  startDate: z.iso.datetime().nullable().openapi({
    description: "Contract start date (ISO 8601)",
    example: "2024-04-01T00:00:00.000Z",
  }),
  endDate: z.iso.datetime().nullable().openapi({
    description: "Contract end date (ISO 8601)",
    example: "2025-03-31T23:59:59.999Z",
  }),
  publicationDate: z.iso.datetime().nullable().openapi({
    description: "Publication date in official gazette (ISO 8601)",
    example: "2024-03-20T00:00:00.000Z",
  }),
  summary: z.string().nullable().openapi({
    description: "AI-generated contract summary in Portuguese",
    example:
      "Contrato para prestação de serviços de limpeza em prédios públicos, incluindo fornecimento de materiais e equipamentos. Vigência de 12 meses com possibilidade de prorrogação.",
  }),
  summaryGeneratedAt: z.iso.datetime().nullable().openapi({
    description: "When the AI summary was generated (ISO 8601)",
    example: "2024-06-10T14:30:00.000Z",
  }),
  amendmentCount: z.number().int().openapi({
    description: "Number of amendments (aditivos) to this contract",
    example: 2,
  }),
  createdAt: z.iso.datetime().openapi({
    description: "Record creation timestamp (ISO 8601)",
    example: "2024-03-16T09:00:00.000Z",
  }),
  updatedAt: z.iso.datetime().openapi({
    description: "Last update timestamp (ISO 8601)",
    example: "2024-06-15T10:30:00.000Z",
  }),
}).openapi({
  description: "Full contract details including AI-generated content",
});

// Pagination schema
const PaginationSchema = z
  .object({
    page: z.number().int().positive().openapi({
      description: "Current page number (1-indexed)",
      example: 1,
    }),
    pageSize: z.number().int().positive().openapi({
      description: "Number of items per page",
      example: 20,
    }),
    total: z.number().int().nonnegative().openapi({
      description: "Total number of items across all pages",
      example: 150,
    }),
    totalPages: z.number().int().nonnegative().openapi({
      description: "Total number of pages",
      example: 8,
    }),
  })
  .openapi({ description: "Pagination metadata" });

// Paginated contracts response schema
const PaginatedContractsResponseSchema = z
  .object({
    data: z.array(ContractListItemSchema),
    pagination: PaginationSchema,
  })
  .openapi({ description: "Paginated list of contracts" });

// Error response schema
const ErrorResponseSchema = z
  .object({
    code: z
      .enum(["NOT_FOUND", "INVALID_PARAMS", "DATABASE_ERROR", "INTERNAL_ERROR"])
      .openapi({
        description: "Error code for programmatic handling",
        example: "NOT_FOUND",
      }),
    message: z.string().openapi({
      description: "Human-readable error message",
      example: "Contract not found",
    }),
    details: z.unknown().optional().openapi({
      description: "Additional error details (only in development mode)",
    }),
  })
  .openapi({ description: "Standard error response" });

// Query parameters for list contracts
const ListContractsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).openapi({
    description: "Page number (1-indexed)",
    example: 1,
  }),
  pageSize: z.coerce.number().int().positive().max(100).default(20).openapi({
    description: "Items per page (max 100)",
    example: 20,
  }),
  category: ContractCategoryEnum.optional().openapi({
    description: "Filter by contract category",
    example: "OBRAS",
  }),
  agencyId: z.string().optional().openapi({
    description: "Filter by agency ID",
    example: "clx123abc456",
  }),
  supplierId: z.string().optional().openapi({
    description: "Filter by supplier ID",
    example: "clx456def789",
  }),
  startDate: z.iso.datetime().optional().openapi({
    description: "Filter contracts signed on or after this date (ISO 8601)",
    example: "2024-01-01T00:00:00.000Z",
  }),
  endDate: z.iso.datetime().optional().openapi({
    description: "Filter contracts signed on or before this date (ISO 8601)",
    example: "2024-12-31T23:59:59.999Z",
  }),
  minScore: z.coerce.number().int().min(0).max(100).optional().openapi({
    description: "Filter contracts with anomaly score >= this value",
    example: 50,
  }),
  minValue: z.coerce.number().min(0).optional().openapi({
    description: "Filter contracts with value >= this amount (in BRL)",
    example: 100000,
  }),
  maxValue: z.coerce.number().min(0).optional().openapi({
    description: "Filter contracts with value <= this amount (in BRL)",
    example: 5000000,
  }),
  sortBy: z
    .enum(["signatureDate", "value", "totalScore"])
    .default("signatureDate")
    .openapi({
      description:
        "Sort field: signatureDate (default), value, or totalScore (anomaly score)",
      example: "signatureDate",
    }),
  order: z.enum(["asc", "desc"]).default("desc").openapi({
    description: "Sort order: asc (ascending) or desc (descending, default)",
    example: "desc",
  }),
});

// Path parameters for get contract by id
const ContractIdParamSchema = z.object({
  id: z.string().openapi({
    description: "Contract unique identifier",
    example: "clx789ghi012",
  }),
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
    minValue: query.minValue ?? undefined,
    maxValue: query.maxValue ?? undefined,
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
const SimilarContractSchema = z
  .object({
    id: z.string().openapi({
      description: "Contract unique identifier",
      example: "clx111aaa222",
    }),
    externalId: z.string().openapi({
      description: "External ID from source system",
      example: "987654321",
    }),
    number: z.string().openapi({
      description: "Contract number",
      example: "CT-2024/0050",
    }),
    object: z.string().openapi({
      description: "Contract object/description",
      example: "Construção de escola municipal",
    }),
    value: z.number().openapi({
      description: "Contract value in BRL",
      example: 2500000.0,
    }),
    signatureDate: z.iso.datetime().nullable().openapi({
      description: "Signature date (ISO 8601)",
      example: "2024-02-20T00:00:00.000Z",
    }),
    agency: AgencySchema,
    supplier: SupplierSchema,
    anomalyScore: AnomalyScoreSchema.nullable(),
  })
  .openapi({ description: "Similar contract for benchmarking comparison" });

// Category statistics schema
const CategoryStatisticsSchema = z
  .object({
    count: z.number().int().nonnegative().openapi({
      description: "Number of contracts in this category",
      example: 45,
    }),
    average: z.number().openapi({
      description: "Average contract value in BRL",
      example: 1850000.0,
    }),
    median: z.number().openapi({
      description: "Median contract value in BRL",
      example: 1500000.0,
    }),
    min: z.number().openapi({
      description: "Minimum contract value in BRL",
      example: 250000.0,
    }),
    max: z.number().openapi({
      description: "Maximum contract value in BRL",
      example: 5000000.0,
    }),
    standardDeviation: z.number().openapi({
      description: "Standard deviation of contract values",
      example: 850000.0,
    }),
  })
  .openapi({
    description:
      "Statistical summary of contracts in the same category for benchmarking",
  });

// Reference contract schema
const ReferenceContractSchema = z
  .object({
    id: z.string().openapi({
      description: "Reference contract ID",
      example: "clx456ghi789",
    }),
    value: z.number().openapi({
      description: "Reference contract value in BRL",
      example: 1500000.0,
    }),
    category: ContractCategoryEnum,
  })
  .openapi({
    description: "The contract being used as reference for comparison",
  });

// Similar contracts response schema
const SimilarContractsResponseSchema = z
  .object({
    referenceContract: ReferenceContractSchema,
    similarContracts: z.array(SimilarContractSchema).openapi({
      description: "List of similar contracts in the same category",
    }),
    statistics: CategoryStatisticsSchema,
  })
  .openapi({
    description:
      "Similar contracts with statistical comparison for benchmarking",
  });

// Query parameters for similar contracts
const SimilarContractsQuerySchema = z.object({
  startDate: z.iso.datetime().optional().openapi({
    description:
      "Filter similar contracts signed on or after this date (ISO 8601)",
    example: "2024-01-01T00:00:00.000Z",
  }),
  endDate: z.iso.datetime().optional().openapi({
    description:
      "Filter similar contracts signed on or before this date (ISO 8601)",
    example: "2024-12-31T23:59:59.999Z",
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

// ============== Amendments Schemas ==============

// Amendment schema
const AmendmentSchema = z
  .object({
    id: z.string().openapi({
      description: "Amendment unique identifier",
      example: "clx333bbb444",
    }),
    externalId: z.string().openapi({
      description: "External ID from source system",
      example: "ADT-123456",
    }),
    number: z.number().int().openapi({
      description: "Amendment sequence number",
      example: 1,
    }),
    type: z.string().openapi({
      description: "Amendment type (e.g., value, duration, scope)",
      example: "ACRESCIMO",
    }),
    description: z.string().nullable().openapi({
      description: "Amendment description/justification",
      example:
        "Acréscimo de 25% no valor contratual para inclusão de novos serviços",
    }),
    valueChange: z.number().nullable().openapi({
      description:
        "Value change in BRL (positive = increase, negative = decrease)",
      example: 375000.0,
    }),
    durationChange: z.number().int().nullable().openapi({
      description:
        "Duration change in days (positive = extension, negative = reduction)",
      example: 90,
    }),
    signatureDate: z.iso.datetime().nullable().openapi({
      description: "Amendment signature date (ISO 8601)",
      example: "2024-09-15T00:00:00.000Z",
    }),
  })
  .openapi({ description: "Contract amendment (aditivo)" });

// Route: GET /api/contracts/:id/amendments
const getContractAmendmentsRoute = createRoute({
  method: "get",
  path: "/{id}/amendments",
  tags: ["Contracts"],
  summary: "Get contract amendments",
  description:
    "Returns all amendments (aditivos) for a specific contract, ordered by number",
  request: {
    params: ContractIdParamSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.array(AmendmentSchema),
        },
      },
      description: "Successful response with contract amendments",
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

contractsRouter.openapi(getContractAmendmentsRoute, async (c) => {
  const { id } = c.req.valid("param");

  const result = await contractService.getContractAmendments(id);

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
  const responseData = result.data.map((amendment) => ({
    id: amendment.id,
    externalId: amendment.externalId,
    number: amendment.number,
    type: amendment.type,
    description: amendment.description,
    valueChange: amendment.valueChange,
    durationChange: amendment.durationChange,
    signatureDate: amendment.signatureDate?.toISOString() ?? null,
  }));

  return c.json(responseData, 200);
});
