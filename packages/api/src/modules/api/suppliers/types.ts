/**
 * API Suppliers Module Types
 */

import type {
  ScoreCategory,
  ScoreBreakdownItem,
} from "@modules/anomalies/types/index.js";

// Supplier filters for listing
export interface SupplierFilters {
  search?: string | undefined;
}

// Sort options for suppliers
export type SupplierSortField =
  | "tradeName"
  | "totalContracts"
  | "totalValue"
  | "averageScore";
export type SortOrder = "asc" | "desc";

export interface SupplierSortOptions {
  field: SupplierSortField;
  order: SortOrder;
}

// Pagination options
export interface PaginationOptions {
  page: number;
  pageSize: number;
}

// Supplier metrics DTO
export interface SupplierMetricsDto {
  totalContracts: number;
  totalValue: number;
  averageScore: number | null;
}

// Supplier list item DTO
export interface SupplierListItemDto {
  id: string;
  cnpj: string;
  tradeName: string;
  legalName: string;
  metrics: SupplierMetricsDto;
}

// Agency response DTO (for contract detail)
export interface AgencyDto {
  id: string;
  code: string;
  name: string;
  acronym: string | null;
}

// Anomaly score response DTO (for contract detail)
export interface AnomalyScoreDto {
  totalScore: number;
  category: ScoreCategory;
  breakdown: ScoreBreakdownItem[];
  calculatedAt: Date;
}

// Contract in supplier detail DTO
export interface SupplierContractDto {
  id: string;
  externalId: string;
  number: string;
  object: string;
  value: number;
  category: string;
  status: string;
  signatureDate: Date | null;
  agency: AgencyDto;
  anomalyScore: AnomalyScoreDto | null;
}

// Supplier detail DTO
export interface SupplierDetailDto {
  id: string;
  cnpj: string;
  tradeName: string;
  legalName: string;
  metrics: SupplierMetricsDto;
  contracts: SupplierContractDto[];
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
