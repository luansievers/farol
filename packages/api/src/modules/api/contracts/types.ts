/**
 * API Contracts Module Types
 */

import type {
  ScoreCategory,
  ScoreBreakdownItem,
} from "@modules/anomalies/types/index.js";

// Contract filters for listing
export interface ContractFilters {
  category?: string | undefined;
  agencyId?: string | undefined;
  supplierId?: string | undefined;
  startDate?: Date | undefined;
  endDate?: Date | undefined;
  minScore?: number | undefined;
  minValue?: number | undefined;
  maxValue?: number | undefined;
}

// Sort options for contracts
export type ContractSortField = "signatureDate" | "value" | "totalScore";
export type SortOrder = "asc" | "desc";

export interface ContractSortOptions {
  field: ContractSortField;
  order: SortOrder;
}

// Pagination options
export interface PaginationOptions {
  page: number;
  pageSize: number;
}

// Agency response DTO
export interface AgencyDto {
  id: string;
  code: string;
  name: string;
  acronym: string | null;
}

// Supplier response DTO
export interface SupplierDto {
  id: string;
  cnpj: string;
  tradeName: string;
  legalName: string;
}

// Anomaly score response DTO
export interface AnomalyScoreDto {
  totalScore: number;
  category: ScoreCategory;
  breakdown: ScoreBreakdownItem[];
  calculatedAt: Date;
}

// Contract list item DTO
export interface ContractListItemDto {
  id: string;
  externalId: string;
  number: string;
  object: string;
  value: number;
  category: string;
  status: string;
  signatureDate: Date | null;
  agency: AgencyDto;
  supplier: SupplierDto;
  anomalyScore: AnomalyScoreDto | null;
}

// Contract detail DTO
export interface ContractDetailDto extends ContractListItemDto {
  modalidade: string | null;
  startDate: Date | null;
  endDate: Date | null;
  publicationDate: Date | null;
  summary: string | null;
  summaryGeneratedAt: Date | null;
  amendmentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Paginated response
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
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
  signatureDate: Date | null;
}

// Similar contracts filters
export interface SimilarContractsFilters {
  startDate?: Date | undefined;
  endDate?: Date | undefined;
}

// Similar contract item DTO (simplified version for comparison)
export interface SimilarContractDto {
  id: string;
  externalId: string;
  number: string;
  object: string;
  value: number;
  signatureDate: Date | null;
  agency: AgencyDto;
  supplier: SupplierDto;
  anomalyScore: AnomalyScoreDto | null;
}

// Category statistics DTO
export interface CategoryStatisticsDto {
  count: number;
  average: number;
  median: number;
  min: number;
  max: number;
  standardDeviation: number;
}

// Similar contracts response DTO
export interface SimilarContractsResponseDto {
  referenceContract: {
    id: string;
    value: number;
    category: string;
  };
  similarContracts: SimilarContractDto[];
  statistics: CategoryStatisticsDto;
}

// API error codes
export type ApiErrorCode =
  | "NOT_FOUND"
  | "INVALID_PARAMS"
  | "DATABASE_ERROR"
  | "INTERNAL_ERROR";

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  details?: unknown;
}
