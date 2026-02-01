/**
 * Shared DTOs
 * Note: Date fields use generic type to support both Date (backend) and string (frontend JSON)
 */

import type {
  ScoreCategory,
  ScoreCriterion,
  ApiErrorCode,
  SearchResultType,
} from "../enums/index.js";

// Generic date type for flexibility between backend (Date) and frontend (string)
export type DateField<T extends Date | string = Date | string> = T;

// Utility type
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

// =============================================================================
// Base DTOs
// =============================================================================

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
  criterion: ScoreCriterion;
  score: number;
  reason: string | null;
  isContributing: boolean;
}

export interface AnomalyScoreDto<T extends Date | string = Date | string> {
  totalScore: number;
  category: ScoreCategory;
  breakdown: ScoreBreakdownItem[];
  calculatedAt: DateField<T>;
}

// =============================================================================
// Pagination
// =============================================================================

export interface PaginationOptions {
  page: number;
  pageSize: number;
}

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

// =============================================================================
// Sorting
// =============================================================================

export type SortOrder = "asc" | "desc";

// =============================================================================
// Contracts
// =============================================================================

export interface ContractFilters {
  category?: string | undefined;
  agencyId?: string | undefined;
  supplierId?: string | undefined;
  startDate?: Date | string | undefined;
  endDate?: Date | string | undefined;
  minScore?: number | undefined;
}

export type ContractSortField = "signatureDate" | "value" | "totalScore";

export interface ContractSortOptions {
  field: ContractSortField;
  order: SortOrder;
}

export interface ContractListItemDto<T extends Date | string = Date | string> {
  id: string;
  externalId: string;
  number: string;
  object: string;
  value: number;
  category: string;
  status: string;
  signatureDate: DateField<T> | null;
  agency: AgencyDto;
  supplier: SupplierDto;
  anomalyScore: AnomalyScoreDto<T> | null;
}

export interface ContractDetailDto<T extends Date | string = Date | string>
  extends ContractListItemDto<T> {
  modalidade: string | null;
  startDate: DateField<T> | null;
  endDate: DateField<T> | null;
  publicationDate: DateField<T> | null;
  summary: string | null;
  summaryGeneratedAt: DateField<T> | null;
  amendmentCount: number;
  createdAt: DateField<T>;
  updatedAt: DateField<T>;
}

export interface AmendmentDto<T extends Date | string = Date | string> {
  id: string;
  externalId: string;
  number: number;
  type: string;
  description: string | null;
  valueChange: number | null;
  durationChange: number | null;
  signatureDate: DateField<T> | null;
}

// =============================================================================
// Similar Contracts
// =============================================================================

export interface SimilarContractsFilters {
  startDate?: Date | string | undefined;
  endDate?: Date | string | undefined;
}

export interface SimilarContractDto<T extends Date | string = Date | string> {
  id: string;
  externalId: string;
  number: string;
  object: string;
  value: number;
  signatureDate: DateField<T> | null;
  agency: AgencyDto;
  supplier: SupplierDto;
  anomalyScore: AnomalyScoreDto<T> | null;
}

export interface CategoryStatisticsDto {
  count: number;
  average: number;
  median: number;
  min: number;
  max: number;
  standardDeviation: number;
}

export interface SimilarContractsResponseDto<
  T extends Date | string = Date | string,
> {
  referenceContract: {
    id: string;
    value: number;
    category: string;
  };
  similarContracts: SimilarContractDto<T>[];
  statistics: CategoryStatisticsDto;
}

// =============================================================================
// Suppliers
// =============================================================================

export interface SupplierFilters {
  search?: string | undefined;
}

export type SupplierSortField = "tradeName" | "totalContracts" | "totalValue";

export interface SupplierSortOptions {
  field: SupplierSortField;
  order: SortOrder;
}

export interface SupplierMetricsDto {
  totalContracts: number;
  totalValue: number;
  averageScore: number | null;
}

export interface SupplierListItemDto {
  id: string;
  cnpj: string;
  tradeName: string;
  legalName: string;
  metrics: SupplierMetricsDto;
}

export interface SupplierContractDto<T extends Date | string = Date | string> {
  id: string;
  externalId: string;
  number: string;
  object: string;
  value: number;
  category: string;
  status: string;
  signatureDate: DateField<T> | null;
  agency: AgencyDto;
  anomalyScore: AnomalyScoreDto<T> | null;
}

export interface SupplierDetailDto<T extends Date | string = Date | string> {
  id: string;
  cnpj: string;
  tradeName: string;
  legalName: string;
  metrics: SupplierMetricsDto;
  contracts: SupplierContractDto<T>[];
  createdAt: DateField<T>;
  updatedAt: DateField<T>;
}

// =============================================================================
// Agencies
// =============================================================================

export interface AgencyFilters {
  search?: string | undefined;
}

export type AgencySortField = "name" | "totalContracts" | "totalValue";

export interface AgencySortOptions {
  field: AgencySortField;
  order: SortOrder;
}

export interface AgencyMetricsDto {
  totalContracts: number;
  totalValue: number;
  averageScore: number | null;
}

export interface AgencyListItemDto {
  id: string;
  code: string;
  name: string;
  acronym: string | null;
  metrics: AgencyMetricsDto;
}

export interface AgencyContractDto<T extends Date | string = Date | string> {
  id: string;
  externalId: string;
  number: string;
  object: string;
  value: number;
  category: string;
  status: string;
  signatureDate: DateField<T> | null;
  supplier: SupplierDto;
  anomalyScore: AnomalyScoreDto<T> | null;
}

export interface AgencyDetailDto<T extends Date | string = Date | string> {
  id: string;
  code: string;
  name: string;
  acronym: string | null;
  metrics: AgencyMetricsDto;
  contracts: AgencyContractDto<T>[];
  createdAt: DateField<T>;
  updatedAt: DateField<T>;
}

// =============================================================================
// Search
// =============================================================================

export interface SearchResultItemBase {
  id: string;
  type: SearchResultType;
  label: string;
  sublabel: string;
}

export interface ContractSearchResult extends SearchResultItemBase {
  type: "contract";
  value: number;
  category: string;
  anomalyScore: number | null;
}

export interface SupplierSearchResult extends SearchResultItemBase {
  type: "supplier";
  cnpj: string;
  totalContracts: number;
  totalValue: number;
}

export interface AgencySearchResult extends SearchResultItemBase {
  type: "agency";
  code: string;
  totalContracts: number;
  totalValue: number;
}

export type SearchResultItem =
  | ContractSearchResult
  | SupplierSearchResult
  | AgencySearchResult;

export interface GroupedSearchResults {
  contracts: ContractSearchResult[];
  suppliers: SupplierSearchResult[];
  agencies: AgencySearchResult[];
  totalCount: number;
}

export interface SearchFilters {
  query: string;
  types?: SearchResultType[];
  limit?: number;
}

export interface FullSearchResults {
  contracts: {
    items: ContractSearchResult[];
    total: number;
  };
  suppliers: {
    items: SupplierSearchResult[];
    total: number;
  };
  agencies: {
    items: AgencySearchResult[];
    total: number;
  };
}

// =============================================================================
// Errors
// =============================================================================

export interface ApiError {
  code: ApiErrorCode | string;
  message: string;
  details?: unknown;
}

// =============================================================================
// Frontend-specific computed types
// =============================================================================

export interface AgencyConcentration {
  agency: AgencyDto;
  contractCount: number;
  totalValue: number;
  percentage: number;
}

export interface SupplierConcentration {
  supplier: SupplierDto;
  contractCount: number;
  totalValue: number;
  percentage: number;
}

export interface YearlyContractData {
  year: number;
  contractCount: number;
  totalValue: number;
}
