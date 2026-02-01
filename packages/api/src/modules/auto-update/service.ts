/**
 * Auto-update service
 * US-025: Scheduled job to automatically update contract data
 *
 * Features:
 * - Daily cron job to fetch new contracts
 * - Update existing contracts if changed
 * - Recalculate scores for affected contracts
 * - Execution logging with metrics
 * - Failure alerting
 */

import { prisma } from "@modules/database/index.js";
import { createCrawlerService } from "@modules/crawler/service.js";
import { createClassificationService } from "@modules/classification/service.js";
import { createAnomalyService } from "@modules/anomalies/service.js";
import type { Result } from "@shared/types/index.js";
import type {
  AutoUpdateConfig,
  AutoUpdateError,
  ExecutionLog,
  ExecutionMetrics,
  ExecutionStep,
  AlertPayload,
} from "./types/index.js";

const DEFAULT_CONFIG: AutoUpdateConfig = {
  cronExpression: "0 3 * * *", // 3 AM daily
  lookbackDays: 2, // Check last 2 days for new/updated contracts
  alertingEnabled: true,
  maxRetries: 3,
  retryDelayMs: 60000, // 1 minute
};

/**
 * Creates the auto-update service
 */
export function createAutoUpdateService(
  config: Partial<AutoUpdateConfig> = {}
) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const crawler = createCrawlerService({
    rateLimitMs: 1000,
    pageSize: 500,
    maxRetries: 3,
    timeout: 30000,
  });
  const classificationService = createClassificationService({
    batchSize: 50,
    useAIFallback: true,
  });
  const anomalyService = createAnomalyService();

  /**
   * Gets the last successful execution timestamp
   */
  async function getLastExecutionTime(): Promise<Date | null> {
    const lastContract = await prisma.contract.findFirst({
      where: {
        lastFetchedAt: { not: null },
      },
      orderBy: {
        lastFetchedAt: "desc",
      },
      select: {
        lastFetchedAt: true,
      },
    });

    return lastContract?.lastFetchedAt ?? null;
  }

  /**
   * Calculates the date range for fetching contracts
   * Uses last execution time or falls back to lookbackDays
   */
  async function getDateRange(): Promise<{ startDate: Date; endDate: Date }> {
    const endDate = new Date();
    let startDate: Date;

    const lastExecution = await getLastExecutionTime();

    if (lastExecution) {
      // Start from last execution minus 1 day (overlap for safety)
      startDate = new Date(lastExecution);
      startDate.setDate(startDate.getDate() - 1);
    } else {
      // No previous execution, use lookbackDays
      startDate = new Date();
      startDate.setDate(startDate.getDate() - finalConfig.lookbackDays);
    }

    return { startDate, endDate };
  }

  /**
   * Creates a new execution step
   */
  function createStep(name: string): ExecutionStep {
    return {
      name,
      status: "pending",
      startedAt: null,
      finishedAt: null,
      error: null,
    };
  }

  /**
   * Updates step status
   */
  function updateStep(
    step: ExecutionStep,
    status: ExecutionStep["status"],
    error?: string
  ): void {
    step.status = status;
    if (status === "running") {
      step.startedAt = new Date();
    } else if (status === "success" || status === "failed") {
      step.finishedAt = new Date();
      if (error) {
        step.error = error;
      }
    }
  }

  /**
   * Logs execution progress
   */
  function logProgress(message: string): void {
    const timestamp = new Date().toISOString();
    console.log(`[AutoUpdate] ${timestamp} - ${message}`);
  }

  /**
   * Logs execution error
   */
  function logError(message: string, error?: unknown): void {
    const timestamp = new Date().toISOString();
    console.error(`[AutoUpdate] ${timestamp} - ERROR: ${message}`);
    if (error) {
      console.error(error);
    }
  }

  /**
   * Sends an alert (console log for now, can be extended to email/slack)
   */
  function sendAlert(payload: AlertPayload): void {
    if (!finalConfig.alertingEnabled) {
      return;
    }

    const alertLine = "=".repeat(50);
    console.log(`\n${alertLine}`);
    console.log(`[ALERT] ${payload.type.toUpperCase()}`);
    console.log(alertLine);
    console.log(`Timestamp: ${payload.timestamp.toISOString()}`);
    console.log(`Message: ${payload.message}`);
    console.log(`\nMetrics:`);
    console.log(`  - New contracts: ${String(payload.metrics.newContracts)}`);
    console.log(
      `  - Updated contracts: ${String(payload.metrics.updatedContracts)}`
    );
    console.log(
      `  - Scores recalculated: ${String(payload.metrics.scoresRecalculated)}`
    );
    console.log(`  - Errors: ${String(payload.metrics.errors)}`);
    if (payload.metrics.lastError) {
      console.log(`  - Last error: ${payload.metrics.lastError}`);
    }
    console.log(alertLine + "\n");

    // TODO: Future enhancement - send to Slack/email/PagerDuty
    // This is where external alerting integrations would be added
  }

  /**
   * Gets contracts that need score recalculation
   * These are contracts that were updated since last score calculation
   */
  async function getContractsNeedingScoreRecalc(): Promise<string[]> {
    // First, get contracts without anomaly score
    const contractsWithoutScore = await prisma.contract.findMany({
      where: {
        anomalyScore: null,
        category: { not: "OUTROS" },
      },
      select: { id: true },
    });

    // Then, get contracts where score is older than last fetch
    const contractsWithOutdatedScore = await prisma.contract.findMany({
      where: {
        anomalyScore: { isNot: null },
        category: { not: "OUTROS" },
        lastFetchedAt: { not: null },
      },
      select: {
        id: true,
        lastFetchedAt: true,
        anomalyScore: {
          select: { calculatedAt: true },
        },
      },
    });

    // Filter contracts where score calculation is older than last fetch
    const outdatedIds = contractsWithOutdatedScore
      .filter((c) => {
        if (!c.lastFetchedAt || !c.anomalyScore?.calculatedAt) return false;
        return c.anomalyScore.calculatedAt < c.lastFetchedAt;
      })
      .map((c) => c.id);

    // Combine both lists (unique IDs)
    const allIds = new Set([
      ...contractsWithoutScore.map((c) => c.id),
      ...outdatedIds,
    ]);

    return Array.from(allIds);
  }

  /**
   * Recalculates scores for a list of contracts
   */
  async function recalculateScores(
    contractIds: string[]
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const contractId of contractIds) {
      try {
        // Check if contract has anomaly score already
        const existingScore = await prisma.anomalyScore.findUnique({
          where: { contractId },
        });

        if (existingScore) {
          // Recalculate all scores
          await anomalyService.recalculateValueScore(contractId);
          await anomalyService.recalculateAmendmentScore(contractId);
          await anomalyService.recalculateConcentrationScore(contractId);
          await anomalyService.recalculateDurationScore(contractId);
        } else {
          // Create initial scores
          await anomalyService.calculateValueScoreAndSave(contractId);

          // The other scores need value score first, then can be calculated
          const updatedScore = await prisma.anomalyScore.findUnique({
            where: { contractId },
          });

          if (updatedScore) {
            await anomalyService.calculateAmendmentScoreAndSave(contractId);
            await anomalyService.calculateConcentrationScoreAndSave(contractId);
            await anomalyService.calculateDurationScoreAndSave(contractId);
          }
        }

        // Consolidate final score
        await anomalyService.consolidateAndSave(contractId);
        success++;
      } catch (err) {
        failed++;
        logError(`Failed to recalculate score for contract ${contractId}`, err);
      }
    }

    return { success, failed };
  }

  /**
   * Runs the auto-update job
   */
  async function run(): Promise<Result<ExecutionLog, AutoUpdateError>> {
    const executionId = new Date().toISOString();
    const metrics: ExecutionMetrics = {
      startedAt: new Date(),
      finishedAt: null,
      durationMs: null,
      newContracts: 0,
      updatedContracts: 0,
      scoresRecalculated: 0,
      errors: 0,
      lastError: null,
    };

    const steps: ExecutionStep[] = [
      createStep("fetch_contracts"),
      createStep("classify_contracts"),
      createStep("recalculate_scores"),
      createStep("consolidate"),
    ];

    const log: ExecutionLog = {
      id: executionId,
      status: "running",
      metrics,
      steps,
    };

    logProgress(`Starting auto-update job (ID: ${executionId})`);

    try {
      // Step 1: Fetch contracts
      const fetchStep = steps[0];
      if (!fetchStep) {
        throw new Error("Missing fetch step");
      }
      updateStep(fetchStep, "running");
      logProgress("Step 1/4: Fetching new contracts...");

      const { startDate, endDate } = await getDateRange();
      logProgress(
        `  Date range: ${startDate.toISOString().slice(0, 10)} to ${endDate.toISOString().slice(0, 10)}`
      );

      const crawlResult = await crawler.crawlContracts(startDate, endDate);

      if (!crawlResult.success) {
        updateStep(fetchStep, "failed", crawlResult.error.message);
        metrics.errors++;
        metrics.lastError = crawlResult.error.message;
        throw new Error(`Crawler failed: ${crawlResult.error.message}`);
      }

      const crawlStats = crawlResult.data;
      metrics.newContracts = crawlStats.newContracts;
      metrics.updatedContracts = crawlStats.updatedContracts;
      metrics.errors += crawlStats.errors;
      if (crawlStats.lastError) {
        metrics.lastError = crawlStats.lastError;
      }

      updateStep(fetchStep, "success");
      logProgress(
        `  Completed: ${String(crawlStats.newContracts)} new, ${String(crawlStats.updatedContracts)} updated`
      );

      // Step 2: Classify contracts
      const classifyStep = steps[1];
      if (!classifyStep) {
        throw new Error("Missing classify step");
      }
      updateStep(classifyStep, "running");
      logProgress("Step 2/4: Classifying contracts...");

      const classifyResult = await classificationService.processAll();

      if (!classifyResult.success) {
        updateStep(classifyStep, "failed", classifyResult.error.message);
        metrics.errors++;
        metrics.lastError = classifyResult.error.message;
        // Don't throw - classification failure shouldn't stop the job
        logProgress(`  Classification failed: ${classifyResult.error.message}`);
      } else {
        const classifyStats = classifyResult.data;
        logProgress(
          `  Completed: ${String(classifyStats.classified)} classified out of ${String(classifyStats.processed)} processed`
        );
        updateStep(classifyStep, "success");
      }

      // Step 3: Recalculate scores for affected contracts
      const scoreStep = steps[2];
      if (!scoreStep) {
        throw new Error("Missing score step");
      }
      updateStep(scoreStep, "running");
      logProgress("Step 3/4: Recalculating scores for affected contracts...");

      const contractsToRecalc = await getContractsNeedingScoreRecalc();
      logProgress(
        `  Found ${String(contractsToRecalc.length)} contracts needing score recalculation`
      );

      if (contractsToRecalc.length > 0) {
        const scoreResult = await recalculateScores(contractsToRecalc);
        metrics.scoresRecalculated = scoreResult.success;
        metrics.errors += scoreResult.failed;

        logProgress(
          `  Completed: ${String(scoreResult.success)} success, ${String(scoreResult.failed)} failed`
        );
      }

      updateStep(scoreStep, "success");

      // Step 4: Consolidate all scores
      const consolidateStep = steps[3];
      if (!consolidateStep) {
        throw new Error("Missing consolidate step");
      }
      updateStep(consolidateStep, "running");
      logProgress("Step 4/4: Consolidating scores...");

      const consolidateResult = await anomalyService.consolidateAll();
      if (consolidateResult.success) {
        logProgress(
          `  Consolidated ${String(consolidateResult.data.processed)} scores, updated ${String(consolidateResult.data.updated)}`
        );
      }

      updateStep(consolidateStep, "success");

      // Complete execution
      metrics.finishedAt = new Date();
      metrics.durationMs =
        metrics.finishedAt.getTime() - metrics.startedAt.getTime();
      log.status = metrics.errors > 0 ? "failed" : "success";

      // Log summary
      logProgress("=".repeat(50));
      logProgress("Auto-update job completed");
      logProgress(`  Status: ${log.status}`);
      logProgress(
        `  Duration: ${String(Math.round(metrics.durationMs / 1000))}s`
      );
      logProgress(`  New contracts: ${String(metrics.newContracts)}`);
      logProgress(`  Updated contracts: ${String(metrics.updatedContracts)}`);
      logProgress(
        `  Scores recalculated: ${String(metrics.scoresRecalculated)}`
      );
      logProgress(`  Errors: ${String(metrics.errors)}`);
      logProgress("=".repeat(50));

      // Send alert based on result
      if (metrics.errors > 0) {
        sendAlert({
          type: "partial_failure",
          message: `Auto-update completed with ${String(metrics.errors)} errors`,
          metrics,
          timestamp: new Date(),
        });
      } else {
        sendAlert({
          type: "job_success",
          message: "Auto-update completed successfully",
          metrics,
          timestamp: new Date(),
        });
      }

      return { success: true, data: log };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";

      metrics.finishedAt = new Date();
      metrics.durationMs =
        metrics.finishedAt.getTime() - metrics.startedAt.getTime();
      metrics.lastError = errorMessage;
      log.status = "failed";

      logError(`Job failed: ${errorMessage}`);

      // Send failure alert
      sendAlert({
        type: "job_failure",
        message: `Auto-update job failed: ${errorMessage}`,
        metrics,
        timestamp: new Date(),
      });

      return {
        success: false,
        error: {
          code: "UNKNOWN_ERROR",
          message: errorMessage,
          details: err,
        },
      };
    }
  }

  /**
   * Runs the job with retry logic
   */
  async function runWithRetry(): Promise<
    Result<ExecutionLog, AutoUpdateError>
  > {
    let lastError: AutoUpdateError | null = null;

    for (let attempt = 1; attempt <= finalConfig.maxRetries; attempt++) {
      logProgress(
        `Attempt ${String(attempt)}/${String(finalConfig.maxRetries)}`
      );

      const result = await run();

      if (result.success) {
        return result;
      }

      lastError = result.error;

      if (attempt < finalConfig.maxRetries) {
        logProgress(
          `Retrying in ${String(finalConfig.retryDelayMs / 1000)} seconds...`
        );
        await new Promise((resolve) =>
          setTimeout(resolve, finalConfig.retryDelayMs)
        );
      }
    }

    return {
      success: false,
      error: lastError ?? {
        code: "UNKNOWN_ERROR",
        message: "All retry attempts failed",
      },
    };
  }

  /**
   * Gets execution stats for reporting
   */
  async function getStats(): Promise<{
    lastFetchedAt: Date | null;
    totalContracts: number;
    contractsWithScores: number;
    contractsPendingScores: number;
  }> {
    const [lastFetched, totalContracts, withScores, pendingScores] =
      await Promise.all([
        getLastExecutionTime(),
        prisma.contract.count(),
        prisma.anomalyScore.count(),
        prisma.contract.count({
          where: {
            anomalyScore: null,
            category: { not: "OUTROS" },
          },
        }),
      ]);

    return {
      lastFetchedAt: lastFetched,
      totalContracts,
      contractsWithScores: withScores,
      contractsPendingScores: pendingScores,
    };
  }

  return {
    run,
    runWithRetry,
    getStats,
    getLastExecutionTime,
    getDateRange,
    config: finalConfig,
  };
}

export type AutoUpdateService = ReturnType<typeof createAutoUpdateService>;
