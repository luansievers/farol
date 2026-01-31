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
