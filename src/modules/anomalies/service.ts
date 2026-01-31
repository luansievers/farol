/**
 * Anomaly Score Service
 * Calculates anomaly scores for contracts based on multiple criteria
 * US-010: Value Score - Identifies contracts with values significantly above average
 */

import { prisma } from "@modules/database/index.js";
import type { Result } from "@shared/types/index.js";
import type { ContractCategory } from "@/generated/prisma/client.js";
import type {
  AnomalyConfig,
  AnomalyError,
  AnomalyStats,
  AnomalyDatabaseStats,
  ValueScoreResult,
  ValueStats,
  AnomalyScoreResult,
} from "./types/index.js";

const DEFAULT_CONFIG: AnomalyConfig = {
  batchSize: 50,
  minContractsForStats: 5, // Need at least 5 contracts to calculate meaningful stats
  standardDeviationThreshold: 2, // 2 standard deviations above mean
  maxScore: 25, // Maximum score for value anomaly
};

/**
 * Creates the anomaly score service
 */
export function createAnomalyService(config: Partial<AnomalyConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  /**
   * Gets contracts pending value score calculation
   * Contracts that don't have an anomaly score yet
   */
  async function getContractsForValueScore(limit: number) {
    return prisma.contract.findMany({
      where: {
        anomalyScore: null,
        category: {
          not: "OUTROS", // Need a proper category for comparison
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      take: limit,
      select: {
        id: true,
        externalId: true,
        value: true,
        category: true,
        signatureDate: true,
      },
    });
  }

  /**
   * Gets a single contract for scoring
   */
  async function getContractById(contractId: string) {
    return prisma.contract.findUnique({
      where: { id: contractId },
      select: {
        id: true,
        externalId: true,
        value: true,
        category: true,
        signatureDate: true,
        anomalyScore: true,
      },
    });
  }

  /**
   * Calculates mean and standard deviation for contracts in the same category
   * Optionally filters by year for temporal comparison
   */
  async function getCategoryStats(
    category: ContractCategory,
    year: number | null
  ): Promise<ValueStats | null> {
    // Build where clause
    const where: {
      category: ContractCategory;
      signatureDate?: {
        gte: Date;
        lt: Date;
      };
    } = { category };

    if (year) {
      where.signatureDate = {
        gte: new Date(`${String(year)}-01-01`),
        lt: new Date(`${String(year + 1)}-01-01`),
      };
    }

    // Get all contracts in category (for this year if specified)
    const contracts = await prisma.contract.findMany({
      where,
      select: {
        value: true,
      },
    });

    if (contracts.length < finalConfig.minContractsForStats) {
      return null;
    }

    // Calculate mean
    const values = contracts.map((c) => Number(c.value));
    const sum = values.reduce((acc, val) => acc + val, 0);
    const mean = sum / values.length;

    // Calculate standard deviation
    const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
    const avgSquaredDiff =
      squaredDiffs.reduce((acc, val) => acc + val, 0) / values.length;
    const standardDeviation = Math.sqrt(avgSquaredDiff);

    return {
      category,
      year,
      mean,
      standardDeviation,
      contractCount: contracts.length,
      contractValue: 0, // Will be set when calculating for a specific contract
      deviationsFromMean: 0,
      percentageAboveMean: 0,
    };
  }

  /**
   * Calculates the value score for a contract
   * Score is 0-25 based on how many standard deviations above mean
   */
  async function calculateValueScore(
    contractId: string
  ): Promise<Result<ValueScoreResult, AnomalyError>> {
    const contract = await getContractById(contractId);

    if (!contract) {
      return {
        success: false,
        error: {
          code: "INVALID_CONTRACT",
          message: `Contract not found: ${contractId}`,
        },
      };
    }

    // Can't calculate without proper category
    if (contract.category === "OUTROS") {
      return {
        success: false,
        error: {
          code: "NO_CATEGORY",
          message: "Contract must have a specific category (not OUTROS)",
        },
      };
    }

    const contractValue = Number(contract.value);

    // Get year from signature date for temporal comparison
    const year = contract.signatureDate
      ? contract.signatureDate.getFullYear()
      : null;

    // Try to get stats for same year first, then fall back to all time
    let stats = await getCategoryStats(contract.category, year);

    // Fall back to all-time stats for this category if year-specific stats not available
    stats ??= await getCategoryStats(contract.category, null);

    if (!stats) {
      // Not enough contracts in category to calculate stats
      return {
        success: true,
        data: {
          score: 0,
          reason: `Insufficient contracts in category ${contract.category} for statistical analysis`,
          isAnomaly: false,
          stats: null,
        },
      };
    }

    // Calculate how many standard deviations above mean
    const deviationsFromMean =
      stats.standardDeviation > 0
        ? (contractValue - stats.mean) / stats.standardDeviation
        : 0;

    const percentageAboveMean =
      stats.mean > 0 ? ((contractValue - stats.mean) / stats.mean) * 100 : 0;

    // Update stats with contract-specific values
    stats.contractValue = contractValue;
    stats.deviationsFromMean = deviationsFromMean;
    stats.percentageAboveMean = percentageAboveMean;

    // Check if it's an anomaly (> threshold standard deviations above mean)
    const isAnomaly =
      deviationsFromMean > finalConfig.standardDeviationThreshold;

    // Calculate score (0-25)
    // Score increases gradually above threshold
    let score = 0;
    if (isAnomaly) {
      // Map deviations to score: 2 std devs = 5, 3 std devs = 12, 4+ std devs = 25
      const excessDeviations =
        deviationsFromMean - finalConfig.standardDeviationThreshold;
      score = Math.min(
        finalConfig.maxScore,
        Math.round(5 + excessDeviations * 10)
      );
    }

    // Build reason string
    let reason: string;
    if (isAnomaly) {
      const percentFormatted = Math.round(percentageAboveMean);
      const yearInfo = stats.year ? ` in ${String(stats.year)}` : "";
      reason = `Value ${String(percentFormatted)}% above average of similar contracts${yearInfo} (${String(stats.contractCount)} contracts, ${deviationsFromMean.toFixed(1)} std deviations)`;
    } else if (deviationsFromMean > 1) {
      reason = `Value above average but within normal range (${deviationsFromMean.toFixed(1)} std deviations)`;
    } else {
      reason = `Value within normal range for ${contract.category} contracts`;
    }

    return {
      success: true,
      data: {
        score,
        reason,
        isAnomaly,
        stats,
      },
    };
  }

  /**
   * Calculates value score and saves to database
   */
  async function calculateValueScoreAndSave(
    contractId: string
  ): Promise<Result<AnomalyScoreResult, AnomalyError>> {
    const result = await calculateValueScore(contractId);

    if (!result.success) {
      return result;
    }

    const contract = await getContractById(contractId);
    if (!contract) {
      return {
        success: false,
        error: {
          code: "INVALID_CONTRACT",
          message: `Contract not found: ${contractId}`,
        },
      };
    }

    try {
      // Upsert anomaly score (only value fields for now)
      await prisma.anomalyScore.upsert({
        where: { contractId },
        create: {
          contractId,
          totalScore: result.data.score, // For now, just value score
          category:
            result.data.score > 15
              ? "HIGH"
              : result.data.score > 7
                ? "MEDIUM"
                : "LOW",
          valueScore: result.data.score,
          valueReason: result.data.reason,
          // Initialize other scores as 0 (to be calculated later)
          amendmentScore: 0,
          concentrationScore: 0,
          durationScore: 0,
        },
        update: {
          valueScore: result.data.score,
          valueReason: result.data.reason,
          // Recalculate total and category
          totalScore: result.data.score, // Will be updated when other scores are calculated
          category:
            result.data.score > 15
              ? "HIGH"
              : result.data.score > 7
                ? "MEDIUM"
                : "LOW",
        },
      });

      console.log(
        `[Anomaly] ${contract.externalId}: Value score ${String(result.data.score)}/25 - ${result.data.reason}`
      );

      return {
        success: true,
        data: {
          contractId,
          valueScore: result.data.score,
          valueReason: result.data.reason,
        },
      };
    } catch (err) {
      return {
        success: false,
        error: {
          code: "DATABASE_ERROR",
          message: err instanceof Error ? err.message : "Database error",
          details: err,
        },
      };
    }
  }

  /**
   * Process a batch of contracts for value score
   */
  async function processBatch(): Promise<Result<AnomalyStats, AnomalyError>> {
    const stats: AnomalyStats = {
      startedAt: new Date(),
      finishedAt: null,
      processed: 0,
      calculated: 0,
      anomaliesFound: 0,
      errors: 0,
      lastError: null,
    };

    console.log(
      `[Anomaly] Starting value score batch (batch size: ${String(finalConfig.batchSize)})`
    );

    const contracts = await getContractsForValueScore(finalConfig.batchSize);

    if (contracts.length === 0) {
      console.log("[Anomaly] No contracts pending value score calculation");
      stats.finishedAt = new Date();
      return { success: true, data: stats };
    }

    console.log(
      `[Anomaly] Found ${String(contracts.length)} contracts to process`
    );

    for (const contract of contracts) {
      const result = await calculateValueScoreAndSave(contract.id);
      stats.processed++;

      if (result.success) {
        stats.calculated++;
        if (result.data.valueScore > 0) {
          stats.anomaliesFound++;
        }
      } else {
        stats.errors++;
        stats.lastError = result.error.message;
        console.error(
          `[Anomaly] Error calculating value score for ${contract.externalId}: ${result.error.message}`
        );
      }
    }

    stats.finishedAt = new Date();

    console.log("[Anomaly] Batch completed:");
    console.log(`  - Processed: ${String(stats.processed)}`);
    console.log(`  - Calculated: ${String(stats.calculated)}`);
    console.log(`  - Anomalies found: ${String(stats.anomaliesFound)}`);
    console.log(`  - Errors: ${String(stats.errors)}`);

    return { success: true, data: stats };
  }

  /**
   * Process all pending contracts
   */
  async function processAll(): Promise<Result<AnomalyStats, AnomalyError>> {
    const stats: AnomalyStats = {
      startedAt: new Date(),
      finishedAt: null,
      processed: 0,
      calculated: 0,
      anomaliesFound: 0,
      errors: 0,
      lastError: null,
    };

    console.log("[Anomaly] Starting full value score processing run");

    let hasMore = true;

    while (hasMore) {
      const batchResult = await processBatch();

      if (!batchResult.success) {
        stats.lastError = batchResult.error.message;
        stats.finishedAt = new Date();
        return { success: false, error: batchResult.error };
      }

      const batchStats = batchResult.data;
      stats.processed += batchStats.processed;
      stats.calculated += batchStats.calculated;
      stats.anomaliesFound += batchStats.anomaliesFound;
      stats.errors += batchStats.errors;

      if (batchStats.lastError) {
        stats.lastError = batchStats.lastError;
      }

      // Check if there are more contracts to process
      const remaining = await prisma.contract.count({
        where: {
          anomalyScore: null,
          category: {
            not: "OUTROS",
          },
        },
      });

      hasMore = remaining > 0;

      if (hasMore) {
        console.log(`[Anomaly] ${String(remaining)} contracts remaining`);
      }
    }

    stats.finishedAt = new Date();

    console.log("[Anomaly] Full processing completed:");
    console.log(`  - Total processed: ${String(stats.processed)}`);
    console.log(`  - Total calculated: ${String(stats.calculated)}`);
    console.log(`  - Total anomalies found: ${String(stats.anomaliesFound)}`);
    console.log(`  - Total errors: ${String(stats.errors)}`);

    return { success: true, data: stats };
  }

  /**
   * Get anomaly statistics
   */
  async function getStats(): Promise<AnomalyDatabaseStats> {
    const [pending, calculated, byCategory, avgValueScore] = await Promise.all([
      prisma.contract.count({
        where: {
          anomalyScore: null,
          category: {
            not: "OUTROS",
          },
        },
      }),
      prisma.anomalyScore.count(),
      prisma.anomalyScore.groupBy({
        by: ["category"],
        _count: { category: true },
      }),
      prisma.anomalyScore.aggregate({
        _avg: { valueScore: true },
      }),
    ]);

    const categoryCounts = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
    };

    for (const item of byCategory) {
      if (item.category in categoryCounts) {
        categoryCounts[item.category as keyof typeof categoryCounts] =
          item._count.category;
      }
    }

    return {
      pending,
      calculated,
      total: pending + calculated,
      byCategory: categoryCounts,
      averageValueScore: avgValueScore._avg.valueScore ?? 0,
    };
  }

  /**
   * Reset value scores for recalculation
   */
  async function resetValueScores(): Promise<number> {
    const result = await prisma.anomalyScore.updateMany({
      data: {
        valueScore: 0,
        valueReason: null,
        // Recalculate total (sum of all other scores)
        totalScore: 0, // Will need to sum other scores in production
      },
    });

    console.log(
      `[Anomaly] Reset value scores for ${String(result.count)} contracts`
    );
    return result.count;
  }

  /**
   * Delete all anomaly scores (for full recalculation)
   */
  async function resetAllScores(): Promise<number> {
    const result = await prisma.anomalyScore.deleteMany({});

    console.log(
      `[Anomaly] Deleted ${String(result.count)} anomaly score records`
    );
    return result.count;
  }

  /**
   * Recalculate value score for a specific contract
   */
  async function recalculateValueScore(
    contractId: string
  ): Promise<Result<AnomalyScoreResult, AnomalyError>> {
    const contract = await getContractById(contractId);

    if (!contract) {
      return {
        success: false,
        error: {
          code: "INVALID_CONTRACT",
          message: `Contract not found: ${contractId}`,
        },
      };
    }

    return calculateValueScoreAndSave(contractId);
  }

  return {
    calculateValueScore,
    calculateValueScoreAndSave,
    getCategoryStats,
    processBatch,
    processAll,
    getStats,
    resetValueScores,
    resetAllScores,
    recalculateValueScore,
    config: finalConfig,
  };
}

export type AnomalyService = ReturnType<typeof createAnomalyService>;
