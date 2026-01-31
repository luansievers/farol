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
  AmendmentScoreResult,
  AmendmentStats,
  FullAnomalyScoreResult,
  ConcentrationScoreResult,
  ConcentrationStats,
  FullAnomalyScoreWithConcentration,
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

  // ============================================
  // AMENDMENT SCORE (US-011)
  // ============================================

  /**
   * Gets a contract with its amendments for amendment score calculation
   */
  async function getContractWithAmendments(contractId: string) {
    return prisma.contract.findUnique({
      where: { id: contractId },
      select: {
        id: true,
        externalId: true,
        value: true,
        category: true,
        amendments: {
          select: {
            id: true,
            number: true,
            valueChange: true,
          },
        },
        anomalyScore: true,
      },
    });
  }

  /**
   * Gets contracts that need amendment score calculation
   * Contracts that have an anomaly score but amendmentScore = 0
   */
  async function getContractsForAmendmentScore(limit: number) {
    return prisma.contract.findMany({
      where: {
        anomalyScore: {
          amendmentScore: 0,
          amendmentReason: null,
        },
        category: {
          not: "OUTROS",
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
        amendments: {
          select: {
            id: true,
            number: true,
            valueChange: true,
          },
        },
      },
    });
  }

  /**
   * Calculates amendment statistics for a category
   * Returns mean and standard deviation of amendment counts
   */
  async function getAmendmentCategoryStats(
    category: ContractCategory
  ): Promise<{
    mean: number;
    standardDeviation: number;
    count: number;
  } | null> {
    // Get all contracts in the category with their amendment counts
    const contracts = await prisma.contract.findMany({
      where: { category },
      select: {
        id: true,
        _count: {
          select: {
            amendments: true,
          },
        },
      },
    });

    if (contracts.length < finalConfig.minContractsForStats) {
      return null;
    }

    // Calculate mean amendment count
    const amendmentCounts = contracts.map((c) => c._count.amendments);
    const sum = amendmentCounts.reduce((acc, val) => acc + val, 0);
    const mean = sum / amendmentCounts.length;

    // Calculate standard deviation
    const squaredDiffs = amendmentCounts.map((val) => Math.pow(val - mean, 2));
    const avgSquaredDiff =
      squaredDiffs.reduce((acc, val) => acc + val, 0) / amendmentCounts.length;
    const standardDeviation = Math.sqrt(avgSquaredDiff);

    return {
      mean,
      standardDeviation,
      count: contracts.length,
    };
  }

  /**
   * Calculates the amendment score for a contract
   * Score is 0-25 based on:
   * 1. Number of amendments vs category average (> mean + 1.5 std dev)
   * 2. Total amendment value vs original contract value
   */
  async function calculateAmendmentScore(
    contractId: string
  ): Promise<Result<AmendmentScoreResult, AnomalyError>> {
    const contract = await getContractWithAmendments(contractId);

    if (!contract) {
      return {
        success: false,
        error: {
          code: "INVALID_CONTRACT",
          message: `Contract not found: ${contractId}`,
        },
      };
    }

    if (contract.category === "OUTROS") {
      return {
        success: false,
        error: {
          code: "NO_CATEGORY",
          message: "Contract must have a specific category (not OUTROS)",
        },
      };
    }

    const amendmentCount = contract.amendments.length;
    const originalValue = Number(contract.value);

    // Calculate total value change from amendments
    const totalAmendmentValue = contract.amendments.reduce((acc, amendment) => {
      return acc + Math.abs(Number(amendment.valueChange ?? 0));
    }, 0);

    // Calculate value increase ratio (how much amendments added/changed vs original)
    const valueIncreaseRatio =
      originalValue > 0 ? totalAmendmentValue / originalValue : 0;

    // Get category stats for comparison
    const categoryStats = await getAmendmentCategoryStats(contract.category);

    if (!categoryStats) {
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
      categoryStats.standardDeviation > 0
        ? (amendmentCount - categoryStats.mean) /
          categoryStats.standardDeviation
        : 0;

    // Threshold: > mean + 1.5 std dev (as per US-011 requirements)
    const amendmentThreshold = 1.5;
    const isCountAnomaly = deviationsFromMean > amendmentThreshold;

    // Also flag if value increase is significant (> 50% of original)
    const isValueAnomaly = valueIncreaseRatio > 0.5;

    const isAnomaly = isCountAnomaly || isValueAnomaly;

    // Build stats object
    const stats: AmendmentStats = {
      category: contract.category,
      mean: categoryStats.mean,
      standardDeviation: categoryStats.standardDeviation,
      contractCount: categoryStats.count,
      amendmentCount,
      totalAmendmentValue,
      originalContractValue: originalValue,
      valueIncreaseRatio,
      deviationsFromMean,
    };

    // Calculate score (0-25)
    let score = 0;
    if (isAnomaly) {
      // Score based on both count and value anomalies
      let countScore = 0;
      let valueScore = 0;

      if (isCountAnomaly) {
        // Map excess deviations to score: 1.5 std devs = 5, 2.5 std devs = 12, etc.
        const excessDeviations = deviationsFromMean - amendmentThreshold;
        countScore = Math.min(15, Math.round(5 + excessDeviations * 7));
      }

      if (isValueAnomaly) {
        // Map value ratio to score: 50% = 5, 100% = 10, 200%+ = 15
        valueScore = Math.min(15, Math.round(valueIncreaseRatio * 10));
      }

      // Combine scores (weighted average, max 25)
      score = Math.min(finalConfig.maxScore, countScore + valueScore);
    }

    // Build reason string
    let reason: string;
    if (isAnomaly) {
      const parts: string[] = [];

      if (isCountAnomaly) {
        parts.push(
          `${String(amendmentCount)} amendments (category average: ${categoryStats.mean.toFixed(1)})`
        );
      }

      if (isValueAnomaly) {
        const percentFormatted = Math.round(valueIncreaseRatio * 100);
        parts.push(`${String(percentFormatted)}% value change via amendments`);
      }

      reason = parts.join("; ");
    } else if (amendmentCount > 0) {
      reason = `${String(amendmentCount)} amendments within normal range for ${contract.category} (average: ${categoryStats.mean.toFixed(1)})`;
    } else {
      reason = `No amendments`;
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
   * Calculates amendment score and saves to database
   */
  async function calculateAmendmentScoreAndSave(
    contractId: string
  ): Promise<Result<FullAnomalyScoreResult, AnomalyError>> {
    const result = await calculateAmendmentScore(contractId);

    if (!result.success) {
      return result;
    }

    const contract = await getContractWithAmendments(contractId);
    if (!contract) {
      return {
        success: false,
        error: {
          code: "INVALID_CONTRACT",
          message: `Contract not found: ${contractId}`,
        },
      };
    }

    if (!contract.anomalyScore) {
      return {
        success: false,
        error: {
          code: "CALCULATION_FAILED",
          message: `Contract ${contractId} has no anomaly score record. Run value score calculation first.`,
        },
      };
    }

    try {
      // Update anomaly score with amendment data
      const currentValueScore = contract.anomalyScore.valueScore;
      const newTotalScore = currentValueScore + result.data.score;
      const newCategory =
        newTotalScore > 30 ? "HIGH" : newTotalScore > 15 ? "MEDIUM" : "LOW";

      await prisma.anomalyScore.update({
        where: { contractId },
        data: {
          amendmentScore: result.data.score,
          amendmentReason: result.data.reason,
          totalScore: newTotalScore,
          category: newCategory,
        },
      });

      console.log(
        `[Anomaly] ${contract.externalId}: Amendment score ${String(result.data.score)}/25 - ${result.data.reason}`
      );

      return {
        success: true,
        data: {
          contractId,
          valueScore: currentValueScore,
          valueReason: contract.anomalyScore.valueReason ?? "",
          amendmentScore: result.data.score,
          amendmentReason: result.data.reason,
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
   * Process a batch of contracts for amendment score
   */
  async function processAmendmentBatch(): Promise<
    Result<AnomalyStats, AnomalyError>
  > {
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
      `[Anomaly] Starting amendment score batch (batch size: ${String(finalConfig.batchSize)})`
    );

    const contracts = await getContractsForAmendmentScore(
      finalConfig.batchSize
    );

    if (contracts.length === 0) {
      console.log("[Anomaly] No contracts pending amendment score calculation");
      stats.finishedAt = new Date();
      return { success: true, data: stats };
    }

    console.log(
      `[Anomaly] Found ${String(contracts.length)} contracts to process for amendment score`
    );

    for (const contract of contracts) {
      const result = await calculateAmendmentScoreAndSave(contract.id);
      stats.processed++;

      if (result.success) {
        stats.calculated++;
        if (result.data.amendmentScore > 0) {
          stats.anomaliesFound++;
        }
      } else {
        stats.errors++;
        stats.lastError = result.error.message;
        console.error(
          `[Anomaly] Error calculating amendment score for ${contract.externalId}: ${result.error.message}`
        );
      }
    }

    stats.finishedAt = new Date();

    console.log("[Anomaly] Amendment batch completed:");
    console.log(`  - Processed: ${String(stats.processed)}`);
    console.log(`  - Calculated: ${String(stats.calculated)}`);
    console.log(`  - Anomalies found: ${String(stats.anomaliesFound)}`);
    console.log(`  - Errors: ${String(stats.errors)}`);

    return { success: true, data: stats };
  }

  /**
   * Process all pending contracts for amendment score
   */
  async function processAllAmendments(): Promise<
    Result<AnomalyStats, AnomalyError>
  > {
    const stats: AnomalyStats = {
      startedAt: new Date(),
      finishedAt: null,
      processed: 0,
      calculated: 0,
      anomaliesFound: 0,
      errors: 0,
      lastError: null,
    };

    console.log("[Anomaly] Starting full amendment score processing run");

    let hasMore = true;

    while (hasMore) {
      const batchResult = await processAmendmentBatch();

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
      const remaining = await prisma.anomalyScore.count({
        where: {
          amendmentScore: 0,
          amendmentReason: null,
          contract: {
            category: {
              not: "OUTROS",
            },
          },
        },
      });

      hasMore = remaining > 0;

      if (hasMore) {
        console.log(
          `[Anomaly] ${String(remaining)} contracts remaining for amendment score`
        );
      }
    }

    stats.finishedAt = new Date();

    console.log("[Anomaly] Full amendment processing completed:");
    console.log(`  - Total processed: ${String(stats.processed)}`);
    console.log(`  - Total calculated: ${String(stats.calculated)}`);
    console.log(`  - Total anomalies found: ${String(stats.anomaliesFound)}`);
    console.log(`  - Total errors: ${String(stats.errors)}`);

    return { success: true, data: stats };
  }

  /**
   * Reset amendment scores for recalculation
   */
  async function resetAmendmentScores(): Promise<number> {
    // Get all anomaly scores to recalculate totals
    const scores = await prisma.anomalyScore.findMany({
      select: {
        contractId: true,
        valueScore: true,
        concentrationScore: true,
        durationScore: true,
      },
    });

    // Update each score individually to recalculate total
    let count = 0;
    for (const score of scores) {
      const newTotal =
        score.valueScore + score.concentrationScore + score.durationScore;
      const newCategory =
        newTotal > 30 ? "HIGH" : newTotal > 15 ? "MEDIUM" : "LOW";

      await prisma.anomalyScore.update({
        where: { contractId: score.contractId },
        data: {
          amendmentScore: 0,
          amendmentReason: null,
          totalScore: newTotal,
          category: newCategory,
        },
      });
      count++;
    }

    console.log(
      `[Anomaly] Reset amendment scores for ${String(count)} contracts`
    );
    return count;
  }

  /**
   * Recalculate amendment score for a specific contract
   */
  async function recalculateAmendmentScore(
    contractId: string
  ): Promise<Result<FullAnomalyScoreResult, AnomalyError>> {
    const contract = await getContractWithAmendments(contractId);

    if (!contract) {
      return {
        success: false,
        error: {
          code: "INVALID_CONTRACT",
          message: `Contract not found: ${contractId}`,
        },
      };
    }

    return calculateAmendmentScoreAndSave(contractId);
  }

  // ============================================
  // CONCENTRATION SCORE (US-012)
  // ============================================

  /**
   * Concentration threshold: supplier with > 30% of contracts is flagged
   */
  const CONCENTRATION_THRESHOLD = 0.3;

  /**
   * Gets a contract with agency and supplier info for concentration calculation
   */
  async function getContractForConcentration(contractId: string) {
    return prisma.contract.findUnique({
      where: { id: contractId },
      select: {
        id: true,
        externalId: true,
        value: true,
        category: true,
        agencyId: true,
        supplierId: true,
        agency: {
          select: {
            id: true,
            name: true,
          },
        },
        supplier: {
          select: {
            id: true,
            tradeName: true,
          },
        },
        anomalyScore: true,
      },
    });
  }

  /**
   * Gets contracts that need concentration score calculation
   * Contracts that have an anomaly score but concentrationScore = 0 and no reason
   */
  async function getContractsForConcentrationScore(limit: number) {
    return prisma.contract.findMany({
      where: {
        anomalyScore: {
          concentrationScore: 0,
          concentrationReason: null,
        },
        category: {
          not: "OUTROS",
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
        agencyId: true,
        supplierId: true,
        agency: {
          select: {
            id: true,
            name: true,
          },
        },
        supplier: {
          select: {
            id: true,
            tradeName: true,
          },
        },
      },
    });
  }

  /**
   * Calculates supplier concentration stats for an agency
   * Returns how much of the agency's contracts come from a specific supplier
   */
  async function getSupplierConcentrationInAgency(
    agencyId: string,
    supplierId: string,
    agencyName: string,
    supplierName: string
  ): Promise<ConcentrationStats | null> {
    // Get all contracts for this agency (excluding OUTROS category)
    const agencyContracts = await prisma.contract.findMany({
      where: {
        agencyId,
        category: {
          not: "OUTROS",
        },
      },
      select: {
        id: true,
        supplierId: true,
        value: true,
      },
    });

    if (agencyContracts.length < finalConfig.minContractsForStats) {
      return null;
    }

    // Calculate totals for agency
    const totalAgencyContracts = agencyContracts.length;
    const totalAgencyValue = agencyContracts.reduce(
      (acc, c) => acc + Number(c.value),
      0
    );

    // Calculate totals for this supplier within the agency
    const supplierContracts = agencyContracts.filter(
      (c) => c.supplierId === supplierId
    );
    const contractCount = supplierContracts.length;
    const supplierValue = supplierContracts.reduce(
      (acc, c) => acc + Number(c.value),
      0
    );

    // Calculate percentages
    const contractPercentage =
      totalAgencyContracts > 0 ? contractCount / totalAgencyContracts : 0;
    const valuePercentage =
      totalAgencyValue > 0 ? supplierValue / totalAgencyValue : 0;

    return {
      agencyId,
      agencyName,
      supplierId,
      supplierName,
      contractCount,
      totalAgencyContracts,
      contractPercentage,
      supplierValue,
      totalAgencyValue,
      valuePercentage,
    };
  }

  /**
   * Calculates the concentration score for a contract
   * Score is 0-25 based on how concentrated the supplier is within the agency
   * Flags suppliers with > 30% of contracts (by count OR value)
   */
  async function calculateConcentrationScore(
    contractId: string
  ): Promise<Result<ConcentrationScoreResult, AnomalyError>> {
    const contract = await getContractForConcentration(contractId);

    if (!contract) {
      return {
        success: false,
        error: {
          code: "INVALID_CONTRACT",
          message: `Contract not found: ${contractId}`,
        },
      };
    }

    if (contract.category === "OUTROS") {
      return {
        success: false,
        error: {
          code: "NO_CATEGORY",
          message: "Contract must have a specific category (not OUTROS)",
        },
      };
    }

    // Get concentration stats
    const stats = await getSupplierConcentrationInAgency(
      contract.agencyId,
      contract.supplierId,
      contract.agency.name,
      contract.supplier.tradeName
    );

    if (!stats) {
      return {
        success: true,
        data: {
          score: 0,
          reason: `Insufficient contracts in agency for statistical analysis`,
          isAnomaly: false,
          stats: null,
        },
      };
    }

    // Check if concentration exceeds threshold (30%)
    const isContractCountAnomaly =
      stats.contractPercentage > CONCENTRATION_THRESHOLD;
    const isValueAnomaly = stats.valuePercentage > CONCENTRATION_THRESHOLD;
    const isAnomaly = isContractCountAnomaly || isValueAnomaly;

    // Calculate score (0-25)
    let score = 0;
    if (isAnomaly) {
      // Use the higher percentage for scoring
      const maxPercentage = Math.max(
        stats.contractPercentage,
        stats.valuePercentage
      );

      // Map percentage to score:
      // 30% = 5 points, 50% = 12 points, 70%+ = 25 points
      const excessPercentage = maxPercentage - CONCENTRATION_THRESHOLD;
      score = Math.min(
        finalConfig.maxScore,
        Math.round(5 + excessPercentage * 50)
      );
    }

    // Build reason string
    let reason: string;
    if (isAnomaly) {
      const percentByCount = Math.round(stats.contractPercentage * 100);
      const percentByValue = Math.round(stats.valuePercentage * 100);

      const parts: string[] = [];

      if (isContractCountAnomaly) {
        parts.push(
          `Supplier ${stats.supplierName} has ${String(percentByCount)}% of contracts from ${stats.agencyName}`
        );
      }

      if (isValueAnomaly && !isContractCountAnomaly) {
        // Only mention value if count wasn't already flagged
        parts.push(
          `Supplier ${stats.supplierName} has ${String(percentByValue)}% of contract value from ${stats.agencyName}`
        );
      } else if (isValueAnomaly && isContractCountAnomaly && parts[0]) {
        // Add value info as additional context
        parts[0] = `${parts[0]} (${String(percentByValue)}% by value)`;
      }

      reason = parts.join("; ");
    } else {
      const percentByCount = Math.round(stats.contractPercentage * 100);
      reason = `Supplier has ${String(percentByCount)}% of agency contracts (within normal range)`;
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
   * Calculates concentration score and saves to database
   */
  async function calculateConcentrationScoreAndSave(
    contractId: string
  ): Promise<Result<FullAnomalyScoreWithConcentration, AnomalyError>> {
    const result = await calculateConcentrationScore(contractId);

    if (!result.success) {
      return result;
    }

    const contract = await getContractForConcentration(contractId);
    if (!contract) {
      return {
        success: false,
        error: {
          code: "INVALID_CONTRACT",
          message: `Contract not found: ${contractId}`,
        },
      };
    }

    if (!contract.anomalyScore) {
      return {
        success: false,
        error: {
          code: "CALCULATION_FAILED",
          message: `Contract ${contractId} has no anomaly score record. Run value score calculation first.`,
        },
      };
    }

    try {
      // Update anomaly score with concentration data
      const currentValueScore = contract.anomalyScore.valueScore;
      const currentAmendmentScore = contract.anomalyScore.amendmentScore;
      const currentDurationScore = contract.anomalyScore.durationScore;
      const newTotalScore =
        currentValueScore +
        currentAmendmentScore +
        result.data.score +
        currentDurationScore;
      const newCategory =
        newTotalScore > 50 ? "HIGH" : newTotalScore > 25 ? "MEDIUM" : "LOW";

      await prisma.anomalyScore.update({
        where: { contractId },
        data: {
          concentrationScore: result.data.score,
          concentrationReason: result.data.reason,
          totalScore: newTotalScore,
          category: newCategory,
        },
      });

      console.log(
        `[Anomaly] ${contract.externalId}: Concentration score ${String(result.data.score)}/25 - ${result.data.reason}`
      );

      return {
        success: true,
        data: {
          contractId,
          valueScore: currentValueScore,
          valueReason: contract.anomalyScore.valueReason ?? "",
          amendmentScore: currentAmendmentScore,
          amendmentReason: contract.anomalyScore.amendmentReason ?? "",
          concentrationScore: result.data.score,
          concentrationReason: result.data.reason,
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
   * Process a batch of contracts for concentration score
   */
  async function processConcentrationBatch(): Promise<
    Result<AnomalyStats, AnomalyError>
  > {
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
      `[Anomaly] Starting concentration score batch (batch size: ${String(finalConfig.batchSize)})`
    );

    const contracts = await getContractsForConcentrationScore(
      finalConfig.batchSize
    );

    if (contracts.length === 0) {
      console.log(
        "[Anomaly] No contracts pending concentration score calculation"
      );
      stats.finishedAt = new Date();
      return { success: true, data: stats };
    }

    console.log(
      `[Anomaly] Found ${String(contracts.length)} contracts to process for concentration score`
    );

    for (const contract of contracts) {
      const result = await calculateConcentrationScoreAndSave(contract.id);
      stats.processed++;

      if (result.success) {
        stats.calculated++;
        if (result.data.concentrationScore > 0) {
          stats.anomaliesFound++;
        }
      } else {
        stats.errors++;
        stats.lastError = result.error.message;
        console.error(
          `[Anomaly] Error calculating concentration score for ${contract.externalId}: ${result.error.message}`
        );
      }
    }

    stats.finishedAt = new Date();

    console.log("[Anomaly] Concentration batch completed:");
    console.log(`  - Processed: ${String(stats.processed)}`);
    console.log(`  - Calculated: ${String(stats.calculated)}`);
    console.log(`  - Anomalies found: ${String(stats.anomaliesFound)}`);
    console.log(`  - Errors: ${String(stats.errors)}`);

    return { success: true, data: stats };
  }

  /**
   * Process all pending contracts for concentration score
   */
  async function processAllConcentrations(): Promise<
    Result<AnomalyStats, AnomalyError>
  > {
    const stats: AnomalyStats = {
      startedAt: new Date(),
      finishedAt: null,
      processed: 0,
      calculated: 0,
      anomaliesFound: 0,
      errors: 0,
      lastError: null,
    };

    console.log("[Anomaly] Starting full concentration score processing run");

    let hasMore = true;

    while (hasMore) {
      const batchResult = await processConcentrationBatch();

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
      const remaining = await prisma.anomalyScore.count({
        where: {
          concentrationScore: 0,
          concentrationReason: null,
          contract: {
            category: {
              not: "OUTROS",
            },
          },
        },
      });

      hasMore = remaining > 0;

      if (hasMore) {
        console.log(
          `[Anomaly] ${String(remaining)} contracts remaining for concentration score`
        );
      }
    }

    stats.finishedAt = new Date();

    console.log("[Anomaly] Full concentration processing completed:");
    console.log(`  - Total processed: ${String(stats.processed)}`);
    console.log(`  - Total calculated: ${String(stats.calculated)}`);
    console.log(`  - Total anomalies found: ${String(stats.anomaliesFound)}`);
    console.log(`  - Total errors: ${String(stats.errors)}`);

    return { success: true, data: stats };
  }

  /**
   * Reset concentration scores for recalculation
   */
  async function resetConcentrationScores(): Promise<number> {
    // Get all anomaly scores to recalculate totals
    const scores = await prisma.anomalyScore.findMany({
      select: {
        contractId: true,
        valueScore: true,
        amendmentScore: true,
        durationScore: true,
      },
    });

    // Update each score individually to recalculate total
    let count = 0;
    for (const score of scores) {
      const newTotal =
        score.valueScore + score.amendmentScore + score.durationScore;
      const newCategory =
        newTotal > 50 ? "HIGH" : newTotal > 25 ? "MEDIUM" : "LOW";

      await prisma.anomalyScore.update({
        where: { contractId: score.contractId },
        data: {
          concentrationScore: 0,
          concentrationReason: null,
          totalScore: newTotal,
          category: newCategory,
        },
      });
      count++;
    }

    console.log(
      `[Anomaly] Reset concentration scores for ${String(count)} contracts`
    );
    return count;
  }

  /**
   * Recalculate concentration score for a specific contract
   */
  async function recalculateConcentrationScore(
    contractId: string
  ): Promise<Result<FullAnomalyScoreWithConcentration, AnomalyError>> {
    const contract = await getContractForConcentration(contractId);

    if (!contract) {
      return {
        success: false,
        error: {
          code: "INVALID_CONTRACT",
          message: `Contract not found: ${contractId}`,
        },
      };
    }

    return calculateConcentrationScoreAndSave(contractId);
  }

  return {
    // Value score (US-010)
    calculateValueScore,
    calculateValueScoreAndSave,
    getCategoryStats,
    processBatch,
    processAll,
    getStats,
    resetValueScores,
    resetAllScores,
    recalculateValueScore,
    // Amendment score (US-011)
    calculateAmendmentScore,
    calculateAmendmentScoreAndSave,
    getAmendmentCategoryStats,
    processAmendmentBatch,
    processAllAmendments,
    resetAmendmentScores,
    recalculateAmendmentScore,
    // Concentration score (US-012)
    calculateConcentrationScore,
    calculateConcentrationScoreAndSave,
    getSupplierConcentrationInAgency,
    processConcentrationBatch,
    processAllConcentrations,
    resetConcentrationScores,
    recalculateConcentrationScore,
    config: finalConfig,
  };
}

export type AnomalyService = ReturnType<typeof createAnomalyService>;
