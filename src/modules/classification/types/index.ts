/**
 * Classification Module Type Definitions
 */

import type { ContractCategory } from "@/generated/prisma/client.js";

// Re-export for convenience
export type { ContractCategory };

// Error types
export type ClassificationErrorCode =
  | "INVALID_CONTRACT"
  | "NO_TEXT"
  | "AI_ERROR"
  | "DATABASE_ERROR"
  | "CLASSIFICATION_FAILED";

export interface ClassificationError {
  code: ClassificationErrorCode;
  message: string;
  details?: unknown;
}

// Configuration
export interface ClassificationConfig {
  batchSize: number;
  useAIFallback: boolean; // Use AI when keywords don't match
  maxTextLength: number; // Truncate text for AI classification
}

// Classification result
export interface ClassificationResult {
  category: ContractCategory;
  source: ClassificationSource;
  confidence: ClassificationConfidence;
  reason: string;
}

// Classification source
export type ClassificationSource =
  | "official_code" // natureza_despesa code
  | "keywords" // keyword matching
  | "ai" // AI classification
  | "manual"; // manually set

// Confidence level
export type ClassificationConfidence = "high" | "medium" | "low";

// Service stats
export interface ClassificationStats {
  startedAt: Date;
  finishedAt: Date | null;
  processed: number;
  classified: number;
  errors: number;
  bySource: {
    official_code: number;
    keywords: number;
    ai: number;
  };
  byCategory: Record<ContractCategory, number>;
  lastError: string | null;
}

// Database stats
export interface ClassificationDatabaseStats {
  pending: number; // Contracts needing classification (category = OUTROS and not manual)
  classified: number; // Contracts with non-OUTROS category
  manual: number; // Manually classified contracts
  total: number;
  byCategory: Record<ContractCategory, number>;
}

// Official expense nature codes mapping
export interface ExpenseNatureMapping {
  code: string;
  description: string;
  category: ContractCategory;
}
