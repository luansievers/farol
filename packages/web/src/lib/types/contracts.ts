/**
 * Contract types for frontend
 */

// Enums matching backend
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

export const ContractStatus = {
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  SUSPENDED: "SUSPENDED",
} as const;

export type ContractStatus =
  (typeof ContractStatus)[keyof typeof ContractStatus];

export const ScoreCategory = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
} as const;

export type ScoreCategory = (typeof ScoreCategory)[keyof typeof ScoreCategory];

// Display labels for categories
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

// DTOs
export interface AgencyDto {
  id: string;
  code: string;
  name: string;
  acronym: string | null;
}

export interface SupplierDto {
  id: string;
  cnpj: string;
  tradeName: string;
  legalName: string;
}

export interface ScoreBreakdownItem {
  criterion: "value" | "amendment" | "concentration" | "duration";
  score: number;
  reason: string | null;
  isContributing: boolean;
}

export interface AnomalyScoreDto {
  totalScore: number;
  category: ScoreCategory;
  breakdown: ScoreBreakdownItem[];
  calculatedAt: string;
}

export interface ContractListItemDto {
  id: string;
  externalId: string;
  number: string;
  object: string;
  value: number;
  category: ContractCategory;
  status: ContractStatus;
  signatureDate: string | null;
  agency: AgencyDto;
  supplier: SupplierDto;
  anomalyScore: AnomalyScoreDto | null;
}

export interface ContractDetailDto extends ContractListItemDto {
  modalidade: string | null;
  startDate: string | null;
  endDate: string | null;
  publicationDate: string | null;
  summary: string | null;
  summaryGeneratedAt: string | null;
  amendmentCount: number;
  createdAt: string;
  updatedAt: string;
}

// Amendment DTO
export interface AmendmentDto {
  id: string;
  externalId: string;
  number: number;
  type: string;
  description: string | null;
  valueChange: number | null;
  durationChange: number | null;
  signatureDate: string | null;
}

// Similar contracts response
export interface SimilarContractDto {
  id: string;
  externalId: string;
  number: string;
  object: string;
  value: number;
  signatureDate: string | null;
  agency: AgencyDto;
  supplier: SupplierDto;
  anomalyScore: AnomalyScoreDto | null;
}

export interface CategoryStatisticsDto {
  count: number;
  average: number;
  median: number;
  min: number;
  max: number;
  standardDeviation: number;
}

export interface SimilarContractsResponseDto {
  referenceContract: {
    id: string;
    value: number;
    category: ContractCategory;
  };
  similarContracts: SimilarContractDto[];
  statistics: CategoryStatisticsDto;
}

// Pagination
export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

// Filters
export interface ContractFilters {
  category?: ContractCategory;
  agencyId?: string;
  supplierId?: string;
  startDate?: string;
  endDate?: string;
  minScore?: number;
  minValue?: number;
  maxValue?: number;
}

export type ContractSortField = "signatureDate" | "value" | "totalScore";
export type SortOrder = "asc" | "desc";

export interface ContractListParams extends ContractFilters {
  page?: number;
  pageSize?: number;
  sortBy?: ContractSortField;
  order?: SortOrder;
}

// Supplier DTOs
export interface SupplierMetricsDto {
  totalContracts: number;
  totalValue: number;
  averageScore: number | null;
}

export interface SupplierContractDto {
  id: string;
  externalId: string;
  number: string;
  object: string;
  value: number;
  category: ContractCategory;
  status: ContractStatus;
  signatureDate: string | null;
  agency: AgencyDto;
  anomalyScore: AnomalyScoreDto | null;
}

export interface SupplierDetailDto {
  id: string;
  cnpj: string;
  tradeName: string;
  legalName: string;
  metrics: SupplierMetricsDto;
  contracts: SupplierContractDto[];
  createdAt: string;
  updatedAt: string;
}

// Computed metrics for supplier page
export interface AgencyConcentration {
  agency: AgencyDto;
  contractCount: number;
  totalValue: number;
  percentage: number;
}

export interface YearlyContractData {
  year: number;
  contractCount: number;
  totalValue: number;
}

// Agency DTOs
export interface AgencyMetricsDto {
  totalContracts: number;
  totalValue: number;
  averageScore: number | null;
}

export interface AgencyContractDto {
  id: string;
  externalId: string;
  number: string;
  object: string;
  value: number;
  category: ContractCategory;
  status: ContractStatus;
  signatureDate: string | null;
  supplier: SupplierDto;
  anomalyScore: AnomalyScoreDto | null;
}

export interface AgencyDetailDto {
  id: string;
  code: string;
  name: string;
  acronym: string | null;
  metrics: AgencyMetricsDto;
  contracts: AgencyContractDto[];
  createdAt: string;
  updatedAt: string;
}

// Computed metrics for agency page
export interface SupplierConcentration {
  supplier: SupplierDto;
  contractCount: number;
  totalValue: number;
  percentage: number;
}
