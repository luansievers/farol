/**
 * API Agencies Module Types
 */

import type {
  ScoreCategory,
  ScoreBreakdownItem,
} from "@modules/anomalies/types/index.js";

// Agency filters for listing
export interface AgencyFilters {
  search?: string | undefined;
}

// Sort options for agencies
export type AgencySortField = "name" | "totalContracts" | "totalValue";
export type SortOrder = "asc" | "desc";

export interface AgencySortOptions {
  field: AgencySortField;
  order: SortOrder;
}

// Pagination options
export interface PaginationOptions {
  page: number;
  pageSize: number;
}

// Agency metrics DTO
export interface AgencyMetricsDto {
  totalContracts: number;
  totalValue: number;
  averageScore: number | null;
}

// Agency list item DTO
export interface AgencyListItemDto {
  id: string;
  code: string;
  name: string;
  acronym: string | null;
  metrics: AgencyMetricsDto;
}

// Supplier response DTO (for contract detail)
export interface SupplierDto {
  id: string;
  cnpj: string;
  tradeName: string;
  legalName: string;
}

// Anomaly score response DTO (for contract detail)
export interface AnomalyScoreDto {
  totalScore: number;
  category: ScoreCategory;
  breakdown: ScoreBreakdownItem[];
  calculatedAt: Date;
}

// Contract in agency detail DTO
export interface AgencyContractDto {
  id: string;
  externalId: string;
  number: string;
  object: string;
  value: number;
  category: string;
  status: string;
  signatureDate: Date | null;
  supplier: SupplierDto;
  anomalyScore: AnomalyScoreDto | null;
}

// Agency detail DTO
export interface AgencyDetailDto {
  id: string;
  code: string;
  name: string;
  acronym: string | null;
  metrics: AgencyMetricsDto;
  contracts: AgencyContractDto[];
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
