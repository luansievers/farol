/**
 * Auto-update module exports
 * US-025: Automatic contract update job
 */

export { createAutoUpdateService } from "./service.js";
export type { AutoUpdateService } from "./service.js";

export { createScheduler } from "./scheduler.js";
export type { Scheduler, SchedulerOptions } from "./scheduler.js";

export type {
  AutoUpdateConfig,
  ExecutionMetrics,
  ExecutionLog,
  ExecutionStep,
  AutoUpdateError,
  AlertPayload,
} from "./types/index.js";
