/**
 * Shared Enums
 */

// Contract Categories
export const ContractCategory = {
  OBRAS: "OBRAS",
  SERVICOS: "SERVICOS",
  TI: "TI",
  SAUDE: "SAUDE",
  EDUCACAO: "EDUCACAO",
  OUTROS: "OUTROS",
} as const;

export type ContractCategory =
  (typeof ContractCategory)[keyof typeof ContractCategory];

// Contract Status
export const ContractStatus = {
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  SUSPENDED: "SUSPENDED",
} as const;

export type ContractStatus =
  (typeof ContractStatus)[keyof typeof ContractStatus];

// Anomaly Score Category
export const ScoreCategory = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
} as const;

export type ScoreCategory = (typeof ScoreCategory)[keyof typeof ScoreCategory];

// Score Criterion
export const ScoreCriterion = {
  VALUE: "value",
  AMENDMENT: "amendment",
  CONCENTRATION: "concentration",
  DURATION: "duration",
  TIMING: "timing",
  ROUND_NUMBER: "roundNumber",
  FRAGMENTATION: "fragmentation",
  DESCRIPTION: "description",
} as const;

export type ScoreCriterion =
  (typeof ScoreCriterion)[keyof typeof ScoreCriterion];

// API Error Codes
export const ApiErrorCode = {
  NOT_FOUND: "NOT_FOUND",
  INVALID_PARAMS: "INVALID_PARAMS",
  DATABASE_ERROR: "DATABASE_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];

// Search Result Types
export const SearchResultType = {
  CONTRACT: "contract",
  SUPPLIER: "supplier",
  AGENCY: "agency",
} as const;

export type SearchResultType =
  (typeof SearchResultType)[keyof typeof SearchResultType];

// Display Labels (Portuguese)
export const categoryLabels: Record<ContractCategory, string> = {
  OBRAS: "Obras",
  SERVICOS: "Serviços",
  TI: "Tecnologia",
  SAUDE: "Saúde",
  EDUCACAO: "Educação",
  OUTROS: "Outros",
};

export const statusLabels: Record<ContractStatus, string> = {
  ACTIVE: "Ativo",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  SUSPENDED: "Suspenso",
};

export const scoreCategoryLabels: Record<ScoreCategory, string> = {
  LOW: "Baixo",
  MEDIUM: "Médio",
  HIGH: "Alto",
};
