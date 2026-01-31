/**
 * Auto-update job types
 * US-025: Automatic contract update job
 */

export interface AutoUpdateConfig {
  /** Cron expression for job schedule (default: "0 3 * * *" - 3AM daily) */
  cronExpression: string;
  /** Number of days to look back when fetching contracts (default: 2) */
  lookbackDays: number;
  /** Enable alerting on failure (default: true) */
  alertingEnabled: boolean;
  /** Max retries on failure (default: 3) */
  maxRetries: number;
  /** Delay between retries in ms (default: 60000) */
  retryDelayMs: number;
}

export interface ExecutionMetrics {
  /** Execution start time */
  startedAt: Date;
  /** Execution end time */
  finishedAt: Date | null;
  /** Duration in milliseconds */
  durationMs: number | null;
  /** Number of new contracts collected */
  newContracts: number;
  /** Number of contracts updated */
  updatedContracts: number;
  /** Number of scores recalculated */
  scoresRecalculated: number;
  /** Number of errors during execution */
  errors: number;
  /** Last error message if any */
  lastError: string | null;
}

export interface ExecutionLog {
  /** Execution ID (ISO timestamp) */
  id: string;
  /** Execution status */
  status: "running" | "success" | "failed";
  /** Execution metrics */
  metrics: ExecutionMetrics;
  /** Steps completed */
  steps: ExecutionStep[];
}

export interface ExecutionStep {
  /** Step name */
  name: string;
  /** Step status */
  status: "pending" | "running" | "success" | "failed";
  /** Step start time */
  startedAt: Date | null;
  /** Step end time */
  finishedAt: Date | null;
  /** Error message if failed */
  error: string | null;
}

export interface AutoUpdateError {
  code:
    | "CRAWLER_ERROR"
    | "SCORE_CALCULATION_ERROR"
    | "DATABASE_ERROR"
    | "ALERT_ERROR"
    | "UNKNOWN_ERROR";
  message: string;
  details?: unknown;
}

export interface AlertPayload {
  /** Alert type */
  type: "job_failure" | "partial_failure" | "job_success";
  /** Alert message */
  message: string;
  /** Execution metrics */
  metrics: ExecutionMetrics;
  /** Timestamp */
  timestamp: Date;
}
