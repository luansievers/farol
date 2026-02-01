/**
 * Cron scheduler for auto-update job
 * US-025: Scheduled daily execution
 *
 * Uses a simple cron-like scheduler built with setTimeout/setInterval
 * to avoid adding external dependencies.
 */

import { createAutoUpdateService } from "./service.js";
import type { AutoUpdateConfig } from "./types/index.js";

/**
 * Parses a simple cron expression (minute hour day-of-month month day-of-week)
 * Only supports fixed times, not complex patterns
 */
function parseCronExpression(expression: string): {
  minute: number;
  hour: number;
} {
  const parts = expression.split(" ");
  if (parts.length < 2) {
    throw new Error(`Invalid cron expression: ${expression}`);
  }

  const [minutePart, hourPart] = parts;
  if (minutePart === undefined || hourPart === undefined) {
    throw new Error(`Invalid cron expression: ${expression}`);
  }

  const minute = parseInt(minutePart, 10);
  const hour = parseInt(hourPart, 10);

  if (isNaN(minute) || minute < 0 || minute > 59) {
    throw new Error(`Invalid minute in cron expression: ${expression}`);
  }
  if (isNaN(hour) || hour < 0 || hour > 23) {
    throw new Error(`Invalid hour in cron expression: ${expression}`);
  }

  return { minute, hour };
}

/**
 * Calculates milliseconds until next scheduled run
 */
function getMillisecondsUntilNextRun(hour: number, minute: number): number {
  const now = new Date();
  const next = new Date(now);

  next.setHours(hour, minute, 0, 0);

  // If the time has already passed today, schedule for tomorrow
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }

  return next.getTime() - now.getTime();
}

/**
 * Formats milliseconds to human-readable string
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${String(hours)}h ${String(remainingMinutes)}m`;
  }
  if (minutes > 0) {
    return `${String(minutes)}m`;
  }
  return `${String(seconds)}s`;
}

export interface SchedulerOptions {
  config?: Partial<AutoUpdateConfig>;
  runImmediately?: boolean;
}

/**
 * Creates and starts the scheduler
 */
export function createScheduler(options: SchedulerOptions = {}) {
  const { config = {}, runImmediately = false } = options;
  const service = createAutoUpdateService(config);
  const { minute, hour } = parseCronExpression(service.config.cronExpression);

  let isRunning = false;
  let scheduledTimeout: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  /**
   * Logs scheduler messages
   */
  function log(message: string): void {
    const timestamp = new Date().toISOString();
    console.log(`[Scheduler] ${timestamp} - ${message}`);
  }

  /**
   * Executes the job
   */
  async function executeJob(): Promise<void> {
    if (isRunning) {
      log("Job is already running, skipping this execution");
      return;
    }

    isRunning = true;

    try {
      log("Starting scheduled job execution...");
      const result = await service.runWithRetry();

      if (result.success) {
        log(`Job completed with status: ${result.data.status}`);
      } else {
        log(`Job failed: ${result.error.message}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      log(`Unexpected error during job execution: ${message}`);
    } finally {
      isRunning = false;
    }
  }

  /**
   * Schedules the next run
   */
  function scheduleNextRun(): void {
    if (stopped) {
      return;
    }

    const msUntilNext = getMillisecondsUntilNextRun(hour, minute);
    const nextRunTime = new Date(Date.now() + msUntilNext);

    log(
      `Next run scheduled for ${nextRunTime.toISOString()} (in ${formatDuration(msUntilNext)})`
    );

    scheduledTimeout = setTimeout(() => {
      void executeJob().then(() => {
        scheduleNextRun();
      });
    }, msUntilNext);
  }

  /**
   * Starts the scheduler
   */
  async function start(): Promise<void> {
    log(`Starting scheduler with cron: ${service.config.cronExpression}`);
    log(
      `Scheduled time: ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} daily`
    );

    stopped = false;

    if (runImmediately) {
      log("Running immediately as requested...");
      await executeJob();
    }

    scheduleNextRun();
  }

  /**
   * Stops the scheduler
   */
  function stop(): void {
    log("Stopping scheduler...");
    stopped = true;

    if (scheduledTimeout) {
      clearTimeout(scheduledTimeout);
      scheduledTimeout = null;
    }

    log("Scheduler stopped");
  }

  /**
   * Gets scheduler status
   */
  function getStatus(): {
    isRunning: boolean;
    isStopped: boolean;
    nextRunIn: string | null;
    scheduledTime: string;
  } {
    const msUntilNext = stopped
      ? null
      : getMillisecondsUntilNextRun(hour, minute);

    return {
      isRunning,
      isStopped: stopped,
      nextRunIn: msUntilNext ? formatDuration(msUntilNext) : null,
      scheduledTime: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    };
  }

  return {
    start,
    stop,
    executeJob,
    getStatus,
    service,
  };
}

export type Scheduler = ReturnType<typeof createScheduler>;
