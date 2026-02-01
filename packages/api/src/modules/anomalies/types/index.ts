/**
 * Anomaly Score Module Type Definitions
 */

// Error types
export type AnomalyErrorCode =
  | "INVALID_CONTRACT"
  | "NO_CATEGORY"
  | "INSUFFICIENT_DATA"
  | "DATABASE_ERROR"
  | "CALCULATION_FAILED";

export interface AnomalyError {
  code: AnomalyErrorCode;
  message: string;
  details?: unknown;
}

// Configuration
export interface AnomalyConfig {
  batchSize: number;
  minContractsForStats: number; // Minimum contracts in category to calculate stats
  standardDeviationThreshold: number; // Default: 2 standard deviations
  maxScore: number; // Max score for value anomaly (0-25)
}

// Value score calculation result
export interface ValueScoreResult {
  score: number; // 0-25
  reason: string;
  isAnomaly: boolean;
  stats: ValueStats | null;
}

// Statistics for contracts in same category
export interface ValueStats {
  category: string;
  year: number | null;
  mean: number;
  standardDeviation: number;
  contractCount: number;
  contractValue: number;
  deviationsFromMean: number;
  percentageAboveMean: number;
}

// Anomaly score result (partial - just value for now)
export interface AnomalyScoreResult {
  contractId: string;
  valueScore: number;
  valueReason: string;
}

// Amendment score calculation result
export interface AmendmentScoreResult {
  score: number; // 0-25
  reason: string;
  isAnomaly: boolean;
  stats: AmendmentStats | null;
}

// Statistics for amendments in same category
export interface AmendmentStats {
  category: string;
  mean: number;
  standardDeviation: number;
  contractCount: number;
  amendmentCount: number;
  totalAmendmentValue: number;
  originalContractValue: number;
  valueIncreaseRatio: number; // total amendment value / original value
  deviationsFromMean: number;
}

// Full anomaly score result with amendment
export interface FullAnomalyScoreResult {
  contractId: string;
  valueScore: number;
  valueReason: string;
  amendmentScore: number;
  amendmentReason: string;
}

// Concentration score calculation result (US-012)
export interface ConcentrationScoreResult {
  score: number; // 0-25
  reason: string;
  isAnomaly: boolean;
  stats: ConcentrationStats | null;
}

// Statistics for supplier concentration in an agency
export interface ConcentrationStats {
  agencyId: string;
  agencyName: string;
  supplierId: string;
  supplierName: string;
  contractCount: number; // Contracts from this supplier
  totalAgencyContracts: number; // Total contracts in agency
  contractPercentage: number; // % of contracts from this supplier
  supplierValue: number; // Total value from this supplier
  totalAgencyValue: number; // Total value in agency
  valuePercentage: number; // % of value from this supplier
}

// Full anomaly score result with concentration
export interface FullAnomalyScoreWithConcentration {
  contractId: string;
  valueScore: number;
  valueReason: string;
  amendmentScore: number;
  amendmentReason: string;
  concentrationScore: number;
  concentrationReason: string;
}

// Duration score calculation result (US-013)
export interface DurationScoreResult {
  score: number; // 0-25
  reason: string;
  isAnomaly: boolean;
  stats: DurationStats | null;
}

// Statistics for contract duration in same category
export interface DurationStats {
  category: string;
  mean: number; // Mean duration in days
  standardDeviation: number;
  contractCount: number;
  contractDuration: number; // This contract's duration in days
  deviationsFromMean: number;
  isTooShort: boolean; // Below average
  isTooLong: boolean; // Above average
}

// Full anomaly score result with all scores including duration
export interface FullAnomalyScoreWithDuration {
  contractId: string;
  valueScore: number;
  valueReason: string;
  amendmentScore: number;
  amendmentReason: string;
  concentrationScore: number;
  concentrationReason: string;
  durationScore: number;
  durationReason: string;
}

// Service stats
export interface AnomalyStats {
  startedAt: Date;
  finishedAt: Date | null;
  processed: number;
  calculated: number;
  anomaliesFound: number;
  errors: number;
  lastError: string | null;
}

// Database stats
export interface AnomalyDatabaseStats {
  pending: number; // Contracts without anomaly score
  calculated: number; // Contracts with anomaly score
  total: number;
  byCategory: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
  };
  averageValueScore: number;
}

// Category statistics (cached for performance)
export interface CategoryStats {
  category: string;
  year: number | null;
  mean: number;
  standardDeviation: number;
  count: number;
  calculatedAt: Date;
}

// Consolidated score category (US-014)
export type ScoreCategory = "LOW" | "MEDIUM" | "HIGH";

// Individual score breakdown item (US-014)
export interface ScoreBreakdownItem {
  criterion:
    | "value"
    | "amendment"
    | "concentration"
    | "duration"
    | "timing"
    | "roundNumber"
    | "fragmentation"
    | "description";
  score: number;
  reason: string | null;
  isContributing: boolean; // score > 0
}

// Consolidated score result (US-014)
export interface ConsolidatedScoreResult {
  contractId: string;
  totalScore: number; // 0-100
  category: ScoreCategory;
  breakdown: ScoreBreakdownItem[];
  contributingCriteria: string[]; // List of criteria names that contributed (score > 0)
}

// Contract with consolidated score for listing (US-014)
export interface ContractWithScore {
  id: string;
  externalId: string;
  object: string | null;
  value: number;
  category: string | null;
  totalScore: number;
  scoreCategory: ScoreCategory;
  breakdown: ScoreBreakdownItem[];
  contributingCriteria: string[];
}

// Pagination options for contract listing (US-014)
export interface ContractScoreListOptions {
  page?: number;
  pageSize?: number;
  category?: ScoreCategory;
  minScore?: number;
  orderBy?: "score" | "value";
  order?: "asc" | "desc";
}

// Paginated result for contract listing (US-014)
export interface ContractScoreListResult {
  contracts: ContractWithScore[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Round Number score calculation result
export interface RoundNumberScoreResult {
  score: number; // 0-25
  reason: string;
  isAnomaly: boolean;
  stats: RoundNumberStats | null;
}

export interface RoundNumberStats {
  value: number;
  isMultipleOf100k: boolean;
  isMultipleOf10k: boolean;
  isMultipleOf1k: boolean;
  hasNoCents: boolean;
  roundnessFlags: string[];
}

// Timing score calculation result
export interface TimingScoreResult {
  score: number; // 0-25
  reason: string;
  isAnomaly: boolean;
  stats: TimingStats | null;
}

export interface TimingStats {
  signatureDate: Date | null;
  publicationDate: Date | null;
  isDecember: boolean;
  isLastWeekOfDecember: boolean;
  isWeekend: boolean;
  daysFromPublicationToSignature: number | null;
  timingFlags: string[];
}

// Fragmentation score calculation result
export interface FragmentationScoreResult {
  score: number; // 0-25
  reason: string;
  isAnomaly: boolean;
  stats: FragmentationStats | null;
}

export interface FragmentationStats {
  supplierId: string;
  agencyId: string;
  contractsIn30Days: number;
  isNearDispensaLimit: boolean;
  similarContracts: number;
  fragmentationFlags: string[];
}

// Description score calculation result (LLM-based)
export interface DescriptionScoreResult {
  score: number; // 0-25
  reason: string;
  isAnomaly: boolean;
  stats: DescriptionStats | null;
}

export interface DescriptionStats {
  objectLength: number;
  isTooGeneric: boolean;
  hasSpecificBrand: boolean;
  hasVagueTerms: boolean;
  isOverlySpecific: boolean;
  descriptionFlags: string[];
}

// Full anomaly score result with all 8 criteria
export interface FullAnomalyScoreWithAllCriteria {
  contractId: string;
  valueScore: number;
  valueReason: string;
  amendmentScore: number;
  amendmentReason: string;
  concentrationScore: number;
  concentrationReason: string;
  durationScore: number;
  durationReason: string;
  timingScore: number;
  timingReason: string;
  roundNumberScore: number;
  roundNumberReason: string;
  fragmentationScore: number;
  fragmentationReason: string;
  descriptionScore: number;
  descriptionReason: string;
}
