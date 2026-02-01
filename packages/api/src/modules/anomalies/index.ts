/**
 * Anomaly Score Module
 * Calculates and manages anomaly scores for contracts
 */

export { createAnomalyService, type AnomalyService } from "./service.js";
export type {
  AnomalyConfig,
  AnomalyError,
  AnomalyErrorCode,
  AnomalyStats,
  AnomalyDatabaseStats,
  ValueScoreResult,
  ValueStats,
  AnomalyScoreResult,
  CategoryStats,
} from "./types/index.js";
