/**
 * Summary Module Type Definitions
 */

// Error types
export type SummaryErrorCode =
  | "NO_TEXT"
  | "AI_ERROR"
  | "DATABASE_ERROR"
  | "INVALID_CONTRACT"
  | "GENERATION_FAILED";

export interface SummaryError {
  code: SummaryErrorCode;
  message: string;
  details?: unknown;
}

// Configuration
export interface SummaryConfig {
  batchSize: number;
  maxTextLength: number; // Truncate extracted text to avoid token limits
  includeAmendments: boolean;
  includeComparison: boolean;
  maxRetries: number;
}

// Structured summary output
export interface ContractSummary {
  objectSimplified: string; // Object in simple language
  value: string; // Formatted value
  parties: {
    agency: string;
    supplier: string;
  };
  duration: {
    startDate: string | null;
    endDate: string | null;
    totalMonths: number | null;
  };
  mainConditions: string[]; // Key contract conditions
  amendments: AmendmentSummary[] | null;
  comparison: ComparisonContext | null;
  generatedAt: Date;
}

export interface AmendmentSummary {
  number: number;
  type: string;
  description: string;
  valueChange: string | null;
  durationChange: string | null;
}

export interface ComparisonContext {
  category: string;
  averageValue: string;
  percentilePosition: string; // e.g., "Above average (top 30%)"
  similarContractsCount: number;
}

// Service stats
export interface SummaryStats {
  startedAt: Date;
  finishedAt: Date | null;
  processed: number;
  generated: number;
  errors: number;
  lastError: string | null;
}

// Database stats
export interface SummaryDatabaseStats {
  ready: number; // Contracts with extractedText but no summary
  generated: number; // Contracts with summary
  failed: number; // Contracts marked as failed
  total: number;
}
