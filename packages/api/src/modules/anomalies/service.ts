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
  DurationScoreResult,
  DurationStats,
  FullAnomalyScoreWithDuration,
  ScoreCategory,
  ScoreBreakdownItem,
  ConsolidatedScoreResult,
  ContractWithScore,
  ContractScoreListOptions,
  ContractScoreListResult,
  RoundNumberScoreResult,
  RoundNumberStats,
  TimingScoreResult,
  TimingStats,
  FragmentationScoreResult,
  FragmentationStats,
  DescriptionScoreResult,
  DescriptionStats,
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
      const yearInfo = stats.year ? ` em ${String(stats.year)}` : "";
      reason = `Valor ${String(percentFormatted)}% acima da média de contratos similares${yearInfo} (${String(stats.contractCount)} contratos, ${deviationsFromMean.toFixed(1)} desvios padrão)`;
    } else if (deviationsFromMean > 1) {
      reason = `Valor acima da média mas dentro da faixa normal (${deviationsFromMean.toFixed(1)} desvios padrão)`;
    } else {
      reason = `Valor dentro da faixa normal para contratos de ${contract.category}`;
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
          `${String(amendmentCount)} aditivos (média da categoria: ${categoryStats.mean.toFixed(1)})`
        );
      }

      if (isValueAnomaly) {
        const percentFormatted = Math.round(valueIncreaseRatio * 100);
        parts.push(`${String(percentFormatted)}% de alteração de valor via aditivos`);
      }

      reason = parts.join("; ");
    } else if (amendmentCount > 0) {
      reason = `${String(amendmentCount)} aditivos dentro da faixa normal para ${contract.category} (média: ${categoryStats.mean.toFixed(1)})`;
    } else {
      reason = `Sem aditivos`;
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
          `Fornecedor ${stats.supplierName} tem ${String(percentByCount)}% dos contratos de ${stats.agencyName}`
        );
      }

      if (isValueAnomaly && !isContractCountAnomaly) {
        // Only mention value if count wasn't already flagged
        parts.push(
          `Fornecedor ${stats.supplierName} tem ${String(percentByValue)}% do valor de contratos de ${stats.agencyName}`
        );
      } else if (isValueAnomaly && isContractCountAnomaly && parts[0]) {
        // Add value info as additional context
        parts[0] = `${parts[0]} (${String(percentByValue)}% do valor)`;
      }

      reason = parts.join("; ");
    } else {
      const percentByCount = Math.round(stats.contractPercentage * 100);
      reason = `Fornecedor tem ${String(percentByCount)}% dos contratos do órgão (dentro da faixa normal)`;
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

  // ============================================
  // DURATION SCORE (US-013)
  // ============================================

  /**
   * Threshold for duration anomaly: > 1.5 standard deviations from mean
   */
  const DURATION_STD_DEV_THRESHOLD = 1.5;

  /**
   * Gets a contract with dates for duration calculation
   */
  async function getContractForDuration(contractId: string) {
    return prisma.contract.findUnique({
      where: { id: contractId },
      select: {
        id: true,
        externalId: true,
        category: true,
        startDate: true,
        endDate: true,
        signatureDate: true,
        anomalyScore: true,
      },
    });
  }

  /**
   * Gets contracts that need duration score calculation
   * Contracts that have an anomaly score but durationScore = 0 and no reason
   */
  async function getContractsForDurationScore(limit: number) {
    return prisma.contract.findMany({
      where: {
        anomalyScore: {
          durationScore: 0,
          durationReason: null,
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
        category: true,
        startDate: true,
        endDate: true,
        signatureDate: true,
      },
    });
  }

  /**
   * Calculates contract duration in days
   * Uses startDate and endDate, falling back to signatureDate if needed
   */
  function calculateContractDuration(contract: {
    startDate: Date | null;
    endDate: Date | null;
    signatureDate: Date | null;
  }): number | null {
    const start = contract.startDate ?? contract.signatureDate;
    const end = contract.endDate;

    if (!start || !end) {
      return null;
    }

    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 0 ? diffDays : null;
  }

  /**
   * Calculates duration statistics for a category
   * Returns mean and standard deviation of contract durations
   */
  async function getDurationCategoryStats(category: ContractCategory): Promise<{
    mean: number;
    standardDeviation: number;
    count: number;
  } | null> {
    // Get all contracts in the category with dates
    const contracts = await prisma.contract.findMany({
      where: {
        category,
        OR: [{ startDate: { not: null } }, { signatureDate: { not: null } }],
        endDate: { not: null },
      },
      select: {
        startDate: true,
        endDate: true,
        signatureDate: true,
      },
    });

    // Calculate durations for contracts with valid dates
    const durations: number[] = [];
    for (const contract of contracts) {
      const duration = calculateContractDuration(contract);
      if (duration !== null && duration > 0) {
        durations.push(duration);
      }
    }

    if (durations.length < finalConfig.minContractsForStats) {
      return null;
    }

    // Calculate mean
    const sum = durations.reduce((acc, val) => acc + val, 0);
    const mean = sum / durations.length;

    // Calculate standard deviation
    const squaredDiffs = durations.map((val) => Math.pow(val - mean, 2));
    const avgSquaredDiff =
      squaredDiffs.reduce((acc, val) => acc + val, 0) / durations.length;
    const standardDeviation = Math.sqrt(avgSquaredDiff);

    return {
      mean,
      standardDeviation,
      count: durations.length,
    };
  }

  /**
   * Calculates the duration score for a contract
   * Score is 0-25 based on how atypical the duration is
   * Flags contracts with duration > mean ± 1.5 std deviations
   */
  async function calculateDurationScore(
    contractId: string
  ): Promise<Result<DurationScoreResult, AnomalyError>> {
    const contract = await getContractForDuration(contractId);

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

    // Calculate this contract's duration
    const contractDuration = calculateContractDuration(contract);

    if (contractDuration === null) {
      return {
        success: true,
        data: {
          score: 0,
          reason: "Missing start or end date for duration calculation",
          isAnomaly: false,
          stats: null,
        },
      };
    }

    // Get category stats
    const categoryStats = await getDurationCategoryStats(contract.category);

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

    // Calculate how many standard deviations from mean
    const deviationsFromMean =
      categoryStats.standardDeviation > 0
        ? (contractDuration - categoryStats.mean) /
          categoryStats.standardDeviation
        : 0;

    // Check if duration is anomalous (too short or too long)
    const isTooShort = deviationsFromMean < -DURATION_STD_DEV_THRESHOLD;
    const isTooLong = deviationsFromMean > DURATION_STD_DEV_THRESHOLD;
    const isAnomaly = isTooShort || isTooLong;

    // Build stats object
    const stats: DurationStats = {
      category: contract.category,
      mean: categoryStats.mean,
      standardDeviation: categoryStats.standardDeviation,
      contractCount: categoryStats.count,
      contractDuration,
      deviationsFromMean,
      isTooShort,
      isTooLong,
    };

    // Calculate score (0-25)
    let score = 0;
    if (isAnomaly) {
      // Use absolute deviation for scoring
      const absDeviations = Math.abs(deviationsFromMean);
      const excessDeviations = absDeviations - DURATION_STD_DEV_THRESHOLD;
      // Map to score: 1.5 std devs = 5, scales up to 25
      score = Math.min(
        finalConfig.maxScore,
        Math.round(5 + excessDeviations * 10)
      );
    }

    // Build reason string
    let reason: string;
    const meanDays = Math.round(categoryStats.mean);

    if (isAnomaly) {
      if (isTooShort) {
        reason = `Duração de ${String(contractDuration)} dias para ${contract.category}, média é ${String(meanDays)} dias (${Math.abs(deviationsFromMean).toFixed(1)} desvios padrão abaixo)`;
      } else {
        reason = `Duração de ${String(contractDuration)} dias para ${contract.category}, média é ${String(meanDays)} dias (${deviationsFromMean.toFixed(1)} desvios padrão acima)`;
      }
    } else if (Math.abs(deviationsFromMean) > 1) {
      reason = `Duração acima/abaixo da média mas dentro da faixa normal (${Math.abs(deviationsFromMean).toFixed(1)} desvios padrão)`;
    } else {
      reason = `Duração dentro da faixa normal para contratos de ${contract.category} (${String(contractDuration)} dias, média: ${String(meanDays)} dias)`;
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
   * Calculates duration score and saves to database
   */
  async function calculateDurationScoreAndSave(
    contractId: string
  ): Promise<Result<FullAnomalyScoreWithDuration, AnomalyError>> {
    const result = await calculateDurationScore(contractId);

    if (!result.success) {
      return result;
    }

    const contract = await getContractForDuration(contractId);
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
      // Update anomaly score with duration data
      const currentValueScore = contract.anomalyScore.valueScore;
      const currentAmendmentScore = contract.anomalyScore.amendmentScore;
      const currentConcentrationScore =
        contract.anomalyScore.concentrationScore;
      const newTotalScore =
        currentValueScore +
        currentAmendmentScore +
        currentConcentrationScore +
        result.data.score;
      const newCategory =
        newTotalScore > 50 ? "HIGH" : newTotalScore > 25 ? "MEDIUM" : "LOW";

      await prisma.anomalyScore.update({
        where: { contractId },
        data: {
          durationScore: result.data.score,
          durationReason: result.data.reason,
          totalScore: newTotalScore,
          category: newCategory,
        },
      });

      console.log(
        `[Anomaly] ${contract.externalId}: Duration score ${String(result.data.score)}/25 - ${result.data.reason}`
      );

      return {
        success: true,
        data: {
          contractId,
          valueScore: currentValueScore,
          valueReason: contract.anomalyScore.valueReason ?? "",
          amendmentScore: currentAmendmentScore,
          amendmentReason: contract.anomalyScore.amendmentReason ?? "",
          concentrationScore: currentConcentrationScore,
          concentrationReason: contract.anomalyScore.concentrationReason ?? "",
          durationScore: result.data.score,
          durationReason: result.data.reason,
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
   * Process a batch of contracts for duration score
   */
  async function processDurationBatch(): Promise<
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
      `[Anomaly] Starting duration score batch (batch size: ${String(finalConfig.batchSize)})`
    );

    const contracts = await getContractsForDurationScore(finalConfig.batchSize);

    if (contracts.length === 0) {
      console.log("[Anomaly] No contracts pending duration score calculation");
      stats.finishedAt = new Date();
      return { success: true, data: stats };
    }

    console.log(
      `[Anomaly] Found ${String(contracts.length)} contracts to process for duration score`
    );

    for (const contract of contracts) {
      const result = await calculateDurationScoreAndSave(contract.id);
      stats.processed++;

      if (result.success) {
        stats.calculated++;
        if (result.data.durationScore > 0) {
          stats.anomaliesFound++;
        }
      } else {
        stats.errors++;
        stats.lastError = result.error.message;
        console.error(
          `[Anomaly] Error calculating duration score for ${contract.externalId}: ${result.error.message}`
        );
      }
    }

    stats.finishedAt = new Date();

    console.log("[Anomaly] Duration batch completed:");
    console.log(`  - Processed: ${String(stats.processed)}`);
    console.log(`  - Calculated: ${String(stats.calculated)}`);
    console.log(`  - Anomalies found: ${String(stats.anomaliesFound)}`);
    console.log(`  - Errors: ${String(stats.errors)}`);

    return { success: true, data: stats };
  }

  /**
   * Process all pending contracts for duration score
   */
  async function processAllDurations(): Promise<
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

    console.log("[Anomaly] Starting full duration score processing run");

    let hasMore = true;

    while (hasMore) {
      const batchResult = await processDurationBatch();

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
          durationScore: 0,
          durationReason: null,
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
          `[Anomaly] ${String(remaining)} contracts remaining for duration score`
        );
      }
    }

    stats.finishedAt = new Date();

    console.log("[Anomaly] Full duration processing completed:");
    console.log(`  - Total processed: ${String(stats.processed)}`);
    console.log(`  - Total calculated: ${String(stats.calculated)}`);
    console.log(`  - Total anomalies found: ${String(stats.anomaliesFound)}`);
    console.log(`  - Total errors: ${String(stats.errors)}`);

    return { success: true, data: stats };
  }

  /**
   * Reset duration scores for recalculation
   */
  async function resetDurationScores(): Promise<number> {
    // Get all anomaly scores to recalculate totals
    const scores = await prisma.anomalyScore.findMany({
      select: {
        contractId: true,
        valueScore: true,
        amendmentScore: true,
        concentrationScore: true,
      },
    });

    // Update each score individually to recalculate total
    let count = 0;
    for (const score of scores) {
      const newTotal =
        score.valueScore + score.amendmentScore + score.concentrationScore;
      const newCategory =
        newTotal > 50 ? "HIGH" : newTotal > 25 ? "MEDIUM" : "LOW";

      await prisma.anomalyScore.update({
        where: { contractId: score.contractId },
        data: {
          durationScore: 0,
          durationReason: null,
          totalScore: newTotal,
          category: newCategory,
        },
      });
      count++;
    }

    console.log(
      `[Anomaly] Reset duration scores for ${String(count)} contracts`
    );
    return count;
  }

  /**
   * Recalculate duration score for a specific contract
   */
  async function recalculateDurationScore(
    contractId: string
  ): Promise<Result<FullAnomalyScoreWithDuration, AnomalyError>> {
    const contract = await getContractForDuration(contractId);

    if (!contract) {
      return {
        success: false,
        error: {
          code: "INVALID_CONTRACT",
          message: `Contract not found: ${contractId}`,
        },
      };
    }

    return calculateDurationScoreAndSave(contractId);
  }

  // =============================================
  // Consolidated Score Functions (US-014)
  // =============================================

  /**
   * Calculates the category based on total score
   * With 8 criteria (max 200 pts):
   * LOW: 0-50, MEDIUM: 51-100, HIGH: 101-200
   */
  function calculateCategory(totalScore: number): ScoreCategory {
    if (totalScore > 100) return "HIGH";
    if (totalScore > 50) return "MEDIUM";
    return "LOW";
  }

  /**
   * Builds the score breakdown from an anomaly score record
   */
  function buildScoreBreakdown(score: {
    valueScore: number;
    valueReason: string | null;
    amendmentScore: number;
    amendmentReason: string | null;
    concentrationScore: number;
    concentrationReason: string | null;
    durationScore: number;
    durationReason: string | null;
    timingScore?: number | null;
    timingReason?: string | null;
    roundNumberScore?: number | null;
    roundNumberReason?: string | null;
    fragmentationScore?: number | null;
    fragmentationReason?: string | null;
    descriptionScore?: number | null;
    descriptionReason?: string | null;
  }): ScoreBreakdownItem[] {
    const breakdown: ScoreBreakdownItem[] = [
      {
        criterion: "value",
        score: score.valueScore,
        reason: score.valueReason,
        isContributing: score.valueScore > 0,
      },
      {
        criterion: "amendment",
        score: score.amendmentScore,
        reason: score.amendmentReason,
        isContributing: score.amendmentScore > 0,
      },
      {
        criterion: "concentration",
        score: score.concentrationScore,
        reason: score.concentrationReason,
        isContributing: score.concentrationScore > 0,
      },
      {
        criterion: "duration",
        score: score.durationScore,
        reason: score.durationReason,
        isContributing: score.durationScore > 0,
      },
    ];

    // Add new criteria if present
    if (score.timingScore !== undefined && score.timingScore !== null) {
      breakdown.push({
        criterion: "timing",
        score: score.timingScore,
        reason: score.timingReason ?? null,
        isContributing: score.timingScore > 0,
      });
    }

    if (
      score.roundNumberScore !== undefined &&
      score.roundNumberScore !== null
    ) {
      breakdown.push({
        criterion: "roundNumber",
        score: score.roundNumberScore,
        reason: score.roundNumberReason ?? null,
        isContributing: score.roundNumberScore > 0,
      });
    }

    if (
      score.fragmentationScore !== undefined &&
      score.fragmentationScore !== null
    ) {
      breakdown.push({
        criterion: "fragmentation",
        score: score.fragmentationScore,
        reason: score.fragmentationReason ?? null,
        isContributing: score.fragmentationScore > 0,
      });
    }

    if (
      score.descriptionScore !== undefined &&
      score.descriptionScore !== null
    ) {
      breakdown.push({
        criterion: "description",
        score: score.descriptionScore,
        reason: score.descriptionReason ?? null,
        isContributing: score.descriptionScore > 0,
      });
    }

    return breakdown;
  }

  /**
   * Gets contributing criteria names from breakdown
   */
  function getContributingCriteria(breakdown: ScoreBreakdownItem[]): string[] {
    return breakdown
      .filter((item) => item.isContributing)
      .map((item) => item.criterion);
  }

  /**
   * Calculates total score from all 8 criteria
   */
  function calculateTotalFromScore(score: {
    valueScore: number;
    amendmentScore: number;
    concentrationScore: number;
    durationScore: number;
    timingScore: number | null;
    roundNumberScore: number | null;
    fragmentationScore: number | null;
    descriptionScore: number | null;
  }): number {
    return (
      score.valueScore +
      score.amendmentScore +
      score.concentrationScore +
      score.durationScore +
      (score.timingScore ?? 0) +
      (score.roundNumberScore ?? 0) +
      (score.fragmentationScore ?? 0) +
      (score.descriptionScore ?? 0)
    );
  }

  /**
   * Gets the consolidated score for a contract
   */
  async function getConsolidatedScore(
    contractId: string
  ): Promise<Result<ConsolidatedScoreResult, AnomalyError>> {
    const score = await prisma.anomalyScore.findUnique({
      where: { contractId },
    });

    if (!score) {
      return {
        success: false,
        error: {
          code: "INVALID_CONTRACT",
          message: `No anomaly score found for contract: ${contractId}`,
        },
      };
    }

    const totalScore = calculateTotalFromScore(score);
    const category = calculateCategory(totalScore);
    const breakdown = buildScoreBreakdown(score);
    const contributingCriteria = getContributingCriteria(breakdown);

    return {
      success: true,
      data: {
        contractId,
        totalScore,
        category,
        breakdown,
        contributingCriteria,
      },
    };
  }

  /**
   * Consolidates and saves the score for a contract
   * Recalculates totalScore and category from individual scores
   */
  async function consolidateAndSave(
    contractId: string
  ): Promise<Result<ConsolidatedScoreResult, AnomalyError>> {
    const score = await prisma.anomalyScore.findUnique({
      where: { contractId },
    });

    if (!score) {
      return {
        success: false,
        error: {
          code: "INVALID_CONTRACT",
          message: `No anomaly score found for contract: ${contractId}`,
        },
      };
    }

    const totalScore = calculateTotalFromScore(score);
    const category = calculateCategory(totalScore);

    // Update the database with consolidated values
    await prisma.anomalyScore.update({
      where: { contractId },
      data: {
        totalScore,
        category,
      },
    });

    const breakdown = buildScoreBreakdown(score);
    const contributingCriteria = getContributingCriteria(breakdown);

    console.log(
      `[Anomaly] Consolidated score for ${contractId}: ${String(totalScore)}/100 (${category})`
    );
    if (contributingCriteria.length > 0) {
      console.log(`  Contributing: ${contributingCriteria.join(", ")}`);
    }

    return {
      success: true,
      data: {
        contractId,
        totalScore,
        category,
        breakdown,
        contributingCriteria,
      },
    };
  }

  /**
   * Consolidates all anomaly scores in the database
   */
  async function consolidateAll(): Promise<
    Result<{ processed: number; updated: number }, AnomalyError>
  > {
    const scores = await prisma.anomalyScore.findMany({
      select: {
        contractId: true,
        valueScore: true,
        amendmentScore: true,
        concentrationScore: true,
        durationScore: true,
        timingScore: true,
        roundNumberScore: true,
        fragmentationScore: true,
        descriptionScore: true,
        totalScore: true,
        category: true,
      },
    });

    let processed = 0;
    let updated = 0;

    for (const score of scores) {
      processed++;
      const newTotalScore = calculateTotalFromScore(score);
      const newCategory = calculateCategory(newTotalScore);

      // Only update if values changed
      if (
        newTotalScore !== score.totalScore ||
        newCategory !== score.category
      ) {
        await prisma.anomalyScore.update({
          where: { contractId: score.contractId },
          data: {
            totalScore: newTotalScore,
            category: newCategory,
          },
        });
        updated++;
      }
    }

    console.log(
      `[Anomaly] Consolidated ${String(processed)} scores, updated ${String(updated)}`
    );

    return {
      success: true,
      data: { processed, updated },
    };
  }

  /**
   * Gets contracts ordered by score with pagination
   */
  async function getContractsByScore(
    options: ContractScoreListOptions = {}
  ): Promise<Result<ContractScoreListResult, AnomalyError>> {
    const {
      page = 1,
      pageSize = 20,
      category,
      minScore,
      orderBy = "score",
      order = "desc",
    } = options;

    // Build where clause
    const where: {
      category?: string;
      totalScore?: { gte: number };
    } = {};

    if (category) {
      where.category = category;
    }
    if (minScore !== undefined) {
      where.totalScore = { gte: minScore };
    }

    // Get total count
    const total = await prisma.anomalyScore.count({ where });

    // Get paginated results
    const scores = await prisma.anomalyScore.findMany({
      where,
      orderBy:
        orderBy === "score"
          ? { totalScore: order }
          : { contract: { value: order } },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        contract: {
          select: {
            id: true,
            externalId: true,
            object: true,
            value: true,
            category: true,
          },
        },
      },
    });

    const contracts: ContractWithScore[] = scores.map((score) => {
      const breakdown = buildScoreBreakdown(score);
      return {
        id: score.contract.id,
        externalId: score.contract.externalId,
        object: score.contract.object,
        value: Number(score.contract.value),
        category: score.contract.category,
        totalScore: score.totalScore,
        scoreCategory: score.category as ScoreCategory,
        breakdown,
        contributingCriteria: getContributingCriteria(breakdown),
      };
    });

    return {
      success: true,
      data: {
        contracts,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Gets summary statistics for consolidated scores
   */
  async function getConsolidatedStats(): Promise<{
    total: number;
    byCategory: { LOW: number; MEDIUM: number; HIGH: number };
    averageTotalScore: number;
    withAnomalies: number;
    byCriterion: {
      value: number;
      amendment: number;
      concentration: number;
      duration: number;
      timing: number;
      roundNumber: number;
      fragmentation: number;
      description: number;
    };
  }> {
    const [
      total,
      lowCount,
      mediumCount,
      highCount,
      avgResult,
      withValueAnomaly,
      withAmendmentAnomaly,
      withConcentrationAnomaly,
      withDurationAnomaly,
      withTimingAnomaly,
      withRoundNumberAnomaly,
      withFragmentationAnomaly,
      withDescriptionAnomaly,
    ] = await Promise.all([
      prisma.anomalyScore.count(),
      prisma.anomalyScore.count({ where: { category: "LOW" } }),
      prisma.anomalyScore.count({ where: { category: "MEDIUM" } }),
      prisma.anomalyScore.count({ where: { category: "HIGH" } }),
      prisma.anomalyScore.aggregate({ _avg: { totalScore: true } }),
      prisma.anomalyScore.count({ where: { valueScore: { gt: 0 } } }),
      prisma.anomalyScore.count({ where: { amendmentScore: { gt: 0 } } }),
      prisma.anomalyScore.count({ where: { concentrationScore: { gt: 0 } } }),
      prisma.anomalyScore.count({ where: { durationScore: { gt: 0 } } }),
      prisma.anomalyScore.count({ where: { timingScore: { gt: 0 } } }),
      prisma.anomalyScore.count({ where: { roundNumberScore: { gt: 0 } } }),
      prisma.anomalyScore.count({ where: { fragmentationScore: { gt: 0 } } }),
      prisma.anomalyScore.count({ where: { descriptionScore: { gt: 0 } } }),
    ]);

    // Count contracts with any anomaly (totalScore > 0)
    const withAnomalies = await prisma.anomalyScore.count({
      where: { totalScore: { gt: 0 } },
    });

    return {
      total,
      byCategory: {
        LOW: lowCount,
        MEDIUM: mediumCount,
        HIGH: highCount,
      },
      averageTotalScore: avgResult._avg.totalScore ?? 0,
      withAnomalies,
      byCriterion: {
        value: withValueAnomaly,
        amendment: withAmendmentAnomaly,
        concentration: withConcentrationAnomaly,
        duration: withDurationAnomaly,
        timing: withTimingAnomaly,
        roundNumber: withRoundNumberAnomaly,
        fragmentation: withFragmentationAnomaly,
        description: withDescriptionAnomaly,
      },
    };
  }

  // ============================================
  // ROUND NUMBER SCORE
  // ============================================

  /**
   * Dispensa limit for fragmentation detection
   */
  const DISPENSA_LIMIT = 50000;

  /**
   * Gets a contract for round number calculation
   */
  async function getContractForRoundNumber(contractId: string) {
    return prisma.contract.findUnique({
      where: { id: contractId },
      select: {
        id: true,
        externalId: true,
        value: true,
        anomalyScore: true,
      },
    });
  }

  /**
   * Gets contracts that need round number score calculation
   */
  async function getContractsForRoundNumberScore(limit: number) {
    return prisma.contract.findMany({
      where: {
        anomalyScore: {
          roundNumberScore: null,
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
      },
    });
  }

  /**
   * Calculates the round number score for a contract
   * Detects suspiciously round values
   */
  async function calculateRoundNumberScore(
    contractId: string
  ): Promise<Result<RoundNumberScoreResult, AnomalyError>> {
    const contract = await getContractForRoundNumber(contractId);

    if (!contract) {
      return {
        success: false,
        error: {
          code: "INVALID_CONTRACT",
          message: `Contract not found: ${contractId}`,
        },
      };
    }

    const value = Number(contract.value);
    const flags: string[] = [];
    let score = 0;

    // Check for multiples
    const isMultipleOf100k = value >= 100000 && value % 100000 === 0;
    const isMultipleOf10k = value >= 10000 && value % 10000 === 0;
    const isMultipleOf1k = value >= 1000 && value % 1000 === 0;

    // Check for cents (values > 100k without cents are suspicious)
    const hasNoCents = value > 100000 && value === Math.floor(value);

    if (isMultipleOf100k) {
      score += 15;
      flags.push(`Múltiplo exato de R$ 100.000`);
    } else if (isMultipleOf10k) {
      score += 10;
      flags.push(`Múltiplo exato de R$ 10.000`);
    } else if (isMultipleOf1k) {
      score += 5;
      flags.push(`Múltiplo exato de R$ 1.000`);
    }

    if (hasNoCents && !isMultipleOf1k) {
      score += 5;
      flags.push(`Sem centavos em valor > R$ 100.000`);
    }

    // Cap at 25
    score = Math.min(finalConfig.maxScore, score);

    const isAnomaly = score > 0;

    const stats: RoundNumberStats = {
      value,
      isMultipleOf100k,
      isMultipleOf10k,
      isMultipleOf1k,
      hasNoCents,
      roundnessFlags: flags,
    };

    const reason = isAnomaly
      ? flags.join("; ")
      : "Valor não apresenta padrões de arredondamento suspeitos";

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
   * Calculates round number score and saves to database
   */
  async function calculateRoundNumberScoreAndSave(contractId: string): Promise<
    Result<
      {
        contractId: string;
        roundNumberScore: number;
        roundNumberReason: string;
      },
      AnomalyError
    >
  > {
    const result = await calculateRoundNumberScore(contractId);

    if (!result.success) {
      return result;
    }

    const contract = await getContractForRoundNumber(contractId);
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
      // Get current scores
      const currentScore = contract.anomalyScore;
      const newTotalScore =
        currentScore.valueScore +
        currentScore.amendmentScore +
        currentScore.concentrationScore +
        currentScore.durationScore +
        (currentScore.timingScore ?? 0) +
        result.data.score +
        (currentScore.fragmentationScore ?? 0) +
        (currentScore.descriptionScore ?? 0);
      const newCategory = calculateCategory(newTotalScore);

      await prisma.anomalyScore.update({
        where: { contractId },
        data: {
          roundNumberScore: result.data.score,
          roundNumberReason: result.data.reason,
          totalScore: newTotalScore,
          category: newCategory,
        },
      });

      console.log(
        `[Anomaly] ${contract.externalId}: Round number score ${String(result.data.score)}/25 - ${result.data.reason}`
      );

      return {
        success: true,
        data: {
          contractId,
          roundNumberScore: result.data.score,
          roundNumberReason: result.data.reason,
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
   * Process a batch of contracts for round number score
   */
  async function processRoundNumberBatch(): Promise<
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
      `[Anomaly] Starting round number score batch (batch size: ${String(finalConfig.batchSize)})`
    );

    const contracts = await getContractsForRoundNumberScore(
      finalConfig.batchSize
    );

    if (contracts.length === 0) {
      console.log(
        "[Anomaly] No contracts pending round number score calculation"
      );
      stats.finishedAt = new Date();
      return { success: true, data: stats };
    }

    console.log(
      `[Anomaly] Found ${String(contracts.length)} contracts to process for round number score`
    );

    for (const contract of contracts) {
      const result = await calculateRoundNumberScoreAndSave(contract.id);
      stats.processed++;

      if (result.success) {
        stats.calculated++;
        if (result.data.roundNumberScore > 0) {
          stats.anomaliesFound++;
        }
      } else {
        stats.errors++;
        stats.lastError = result.error.message;
        console.error(
          `[Anomaly] Error calculating round number score for ${contract.externalId}: ${result.error.message}`
        );
      }
    }

    stats.finishedAt = new Date();

    console.log("[Anomaly] Round number batch completed:");
    console.log(`  - Processed: ${String(stats.processed)}`);
    console.log(`  - Calculated: ${String(stats.calculated)}`);
    console.log(`  - Anomalies found: ${String(stats.anomaliesFound)}`);
    console.log(`  - Errors: ${String(stats.errors)}`);

    return { success: true, data: stats };
  }

  /**
   * Process all pending contracts for round number score
   */
  async function processAllRoundNumbers(): Promise<
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

    console.log("[Anomaly] Starting full round number score processing run");

    let hasMore = true;

    while (hasMore) {
      const batchResult = await processRoundNumberBatch();

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

      const remaining = await prisma.anomalyScore.count({
        where: {
          roundNumberScore: null,
        },
      });

      hasMore = remaining > 0;

      if (hasMore) {
        console.log(
          `[Anomaly] ${String(remaining)} contracts remaining for round number score`
        );
      }
    }

    stats.finishedAt = new Date();

    console.log("[Anomaly] Full round number processing completed:");
    console.log(`  - Total processed: ${String(stats.processed)}`);
    console.log(`  - Total calculated: ${String(stats.calculated)}`);
    console.log(`  - Total anomalies found: ${String(stats.anomaliesFound)}`);
    console.log(`  - Total errors: ${String(stats.errors)}`);

    return { success: true, data: stats };
  }

  /**
   * Reset round number scores for recalculation
   */
  async function resetRoundNumberScores(): Promise<number> {
    const result = await prisma.anomalyScore.updateMany({
      data: {
        roundNumberScore: null,
        roundNumberReason: null,
      },
    });

    // Recalculate totals
    await recalculateAllTotals();

    console.log(
      `[Anomaly] Reset round number scores for ${String(result.count)} contracts`
    );
    return result.count;
  }

  // ============================================
  // TIMING SCORE
  // ============================================

  /**
   * Gets a contract for timing calculation
   */
  async function getContractForTiming(contractId: string) {
    return prisma.contract.findUnique({
      where: { id: contractId },
      select: {
        id: true,
        externalId: true,
        signatureDate: true,
        publicationDate: true,
        anomalyScore: true,
      },
    });
  }

  /**
   * Gets contracts that need timing score calculation
   */
  async function getContractsForTimingScore(limit: number) {
    return prisma.contract.findMany({
      where: {
        anomalyScore: {
          timingScore: null,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      take: limit,
      select: {
        id: true,
        externalId: true,
        signatureDate: true,
        publicationDate: true,
      },
    });
  }

  /**
   * Checks if a date is a weekend
   */
  function isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday = 0, Saturday = 6
  }

  /**
   * Checks if date is in December
   */
  function isDecember(date: Date): boolean {
    return date.getMonth() === 11; // December = 11
  }

  /**
   * Checks if date is in last week of December (25-31)
   */
  function isLastWeekOfDecember(date: Date): boolean {
    return date.getMonth() === 11 && date.getDate() >= 25;
  }

  /**
   * Calculates days between two dates
   */
  function daysBetween(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculates the timing score for a contract
   * Detects suspicious timing patterns
   */
  async function calculateTimingScore(
    contractId: string
  ): Promise<Result<TimingScoreResult, AnomalyError>> {
    const contract = await getContractForTiming(contractId);

    if (!contract) {
      return {
        success: false,
        error: {
          code: "INVALID_CONTRACT",
          message: `Contract not found: ${contractId}`,
        },
      };
    }

    const flags: string[] = [];
    let score = 0;

    const signatureDate = contract.signatureDate;
    const publicationDate = contract.publicationDate;

    let isDecemberContract = false;
    let isLastWeek = false;
    let isWeekendContract = false;
    let daysFromPubToSig: number | null = null;

    if (signatureDate) {
      // Check December
      if (isDecember(signatureDate)) {
        score += 10;
        isDecemberContract = true;
        flags.push("Contrato assinado em dezembro");

        // Additional points for last week
        if (isLastWeekOfDecember(signatureDate)) {
          score += 5;
          isLastWeek = true;
          flags.push("Última semana de dezembro");
        }
      }

      // Check weekend
      if (isWeekend(signatureDate)) {
        score += 5;
        isWeekendContract = true;
        flags.push("Assinatura em fim de semana");
      }

      // Check time between publication and signature
      if (publicationDate) {
        daysFromPubToSig = daysBetween(publicationDate, signatureDate);
        if (daysFromPubToSig < 3) {
          score += 5;
          flags.push(
            `Apenas ${String(daysFromPubToSig)} dia(s) entre publicação e assinatura`
          );
        }
      }
    }

    // Cap at 25
    score = Math.min(finalConfig.maxScore, score);

    const isAnomaly = score > 0;

    const stats: TimingStats = {
      signatureDate,
      publicationDate,
      isDecember: isDecemberContract,
      isLastWeekOfDecember: isLastWeek,
      isWeekend: isWeekendContract,
      daysFromPublicationToSignature: daysFromPubToSig,
      timingFlags: flags,
    };

    const reason = isAnomaly
      ? flags.join("; ")
      : "Sem padrões temporais suspeitos";

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
   * Calculates timing score and saves to database
   */
  async function calculateTimingScoreAndSave(
    contractId: string
  ): Promise<
    Result<
      { contractId: string; timingScore: number; timingReason: string },
      AnomalyError
    >
  > {
    const result = await calculateTimingScore(contractId);

    if (!result.success) {
      return result;
    }

    const contract = await getContractForTiming(contractId);
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
      const currentScore = contract.anomalyScore;
      const newTotalScore =
        currentScore.valueScore +
        currentScore.amendmentScore +
        currentScore.concentrationScore +
        currentScore.durationScore +
        result.data.score +
        (currentScore.roundNumberScore ?? 0) +
        (currentScore.fragmentationScore ?? 0) +
        (currentScore.descriptionScore ?? 0);
      const newCategory = calculateCategory(newTotalScore);

      await prisma.anomalyScore.update({
        where: { contractId },
        data: {
          timingScore: result.data.score,
          timingReason: result.data.reason,
          totalScore: newTotalScore,
          category: newCategory,
        },
      });

      console.log(
        `[Anomaly] ${contract.externalId}: Timing score ${String(result.data.score)}/25 - ${result.data.reason}`
      );

      return {
        success: true,
        data: {
          contractId,
          timingScore: result.data.score,
          timingReason: result.data.reason,
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
   * Process a batch of contracts for timing score
   */
  async function processTimingBatch(): Promise<
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
      `[Anomaly] Starting timing score batch (batch size: ${String(finalConfig.batchSize)})`
    );

    const contracts = await getContractsForTimingScore(finalConfig.batchSize);

    if (contracts.length === 0) {
      console.log("[Anomaly] No contracts pending timing score calculation");
      stats.finishedAt = new Date();
      return { success: true, data: stats };
    }

    console.log(
      `[Anomaly] Found ${String(contracts.length)} contracts to process for timing score`
    );

    for (const contract of contracts) {
      const result = await calculateTimingScoreAndSave(contract.id);
      stats.processed++;

      if (result.success) {
        stats.calculated++;
        if (result.data.timingScore > 0) {
          stats.anomaliesFound++;
        }
      } else {
        stats.errors++;
        stats.lastError = result.error.message;
        console.error(
          `[Anomaly] Error calculating timing score for ${contract.externalId}: ${result.error.message}`
        );
      }
    }

    stats.finishedAt = new Date();

    console.log("[Anomaly] Timing batch completed:");
    console.log(`  - Processed: ${String(stats.processed)}`);
    console.log(`  - Calculated: ${String(stats.calculated)}`);
    console.log(`  - Anomalies found: ${String(stats.anomaliesFound)}`);
    console.log(`  - Errors: ${String(stats.errors)}`);

    return { success: true, data: stats };
  }

  /**
   * Process all pending contracts for timing score
   */
  async function processAllTimings(): Promise<
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

    console.log("[Anomaly] Starting full timing score processing run");

    let hasMore = true;

    while (hasMore) {
      const batchResult = await processTimingBatch();

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

      const remaining = await prisma.anomalyScore.count({
        where: {
          timingScore: null,
        },
      });

      hasMore = remaining > 0;

      if (hasMore) {
        console.log(
          `[Anomaly] ${String(remaining)} contracts remaining for timing score`
        );
      }
    }

    stats.finishedAt = new Date();

    console.log("[Anomaly] Full timing processing completed:");
    console.log(`  - Total processed: ${String(stats.processed)}`);
    console.log(`  - Total calculated: ${String(stats.calculated)}`);
    console.log(`  - Total anomalies found: ${String(stats.anomaliesFound)}`);
    console.log(`  - Total errors: ${String(stats.errors)}`);

    return { success: true, data: stats };
  }

  /**
   * Reset timing scores for recalculation
   */
  async function resetTimingScores(): Promise<number> {
    const result = await prisma.anomalyScore.updateMany({
      data: {
        timingScore: null,
        timingReason: null,
      },
    });

    await recalculateAllTotals();

    console.log(
      `[Anomaly] Reset timing scores for ${String(result.count)} contracts`
    );
    return result.count;
  }

  // ============================================
  // FRAGMENTATION SCORE
  // ============================================

  /**
   * Gets a contract for fragmentation calculation
   */
  async function getContractForFragmentation(contractId: string) {
    return prisma.contract.findUnique({
      where: { id: contractId },
      select: {
        id: true,
        externalId: true,
        value: true,
        object: true,
        supplierId: true,
        agencyId: true,
        signatureDate: true,
        anomalyScore: true,
      },
    });
  }

  /**
   * Gets contracts that need fragmentation score calculation
   */
  async function getContractsForFragmentationScore(limit: number) {
    return prisma.contract.findMany({
      where: {
        anomalyScore: {
          fragmentationScore: null,
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
        object: true,
        supplierId: true,
        agencyId: true,
        signatureDate: true,
      },
    });
  }

  /**
   * Simple text similarity using Jaccard coefficient
   */
  function textSimilarity(text1: string | null, text2: string | null): number {
    if (!text1 || !text2) return 0;

    const words1 = new Set(
      text1
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3)
    );
    const words2 = new Set(
      text2
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3)
    );

    if (words1.size === 0 || words2.size === 0) return 0;

    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Calculates the fragmentation score for a contract
   * Detects potential contract splitting to avoid bidding thresholds
   */
  async function calculateFragmentationScore(
    contractId: string
  ): Promise<Result<FragmentationScoreResult, AnomalyError>> {
    const contract = await getContractForFragmentation(contractId);

    if (!contract) {
      return {
        success: false,
        error: {
          code: "INVALID_CONTRACT",
          message: `Contract not found: ${contractId}`,
        },
      };
    }

    const flags: string[] = [];
    let score = 0;

    const value = Number(contract.value);

    // Check if value is near dispensa limit (R$ 40.000-50.000)
    const isNearDispensaLimit = value >= 40000 && value <= DISPENSA_LIMIT;
    if (isNearDispensaLimit) {
      score += 10;
      flags.push(
        `Valor próximo ao limite de dispensa (R$ ${value.toLocaleString("pt-BR")})`
      );
    }

    // Find similar contracts with same supplier/agency in 30 days
    let contractsIn30Days = 0;
    let similarContracts = 0;

    if (contract.signatureDate && contract.supplierId && contract.agencyId) {
      const thirtyDaysAgo = new Date(contract.signatureDate);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAfter = new Date(contract.signatureDate);
      thirtyDaysAfter.setDate(thirtyDaysAfter.getDate() + 30);

      const nearbyContracts = await prisma.contract.findMany({
        where: {
          id: { not: contractId },
          supplierId: contract.supplierId,
          agencyId: contract.agencyId,
          signatureDate: {
            gte: thirtyDaysAgo,
            lte: thirtyDaysAfter,
          },
        },
        select: {
          id: true,
          object: true,
        },
      });

      contractsIn30Days = nearbyContracts.length;

      // Check for 3+ contracts in 30 days
      if (contractsIn30Days >= 3) {
        score += 10;
        flags.push(
          `${String(contractsIn30Days + 1)} contratos com mesmo fornecedor/órgão em 30 dias`
        );
      }

      // Check for similar objects
      for (const nearby of nearbyContracts) {
        const similarity = textSimilarity(contract.object, nearby.object);
        if (similarity > 0.7) {
          similarContracts++;
        }
      }

      if (similarContracts > 0) {
        score += 10;
        flags.push(
          `${String(similarContracts)} contrato(s) com objeto similar (>70% similaridade)`
        );
      }
    }

    // Cap at 25
    score = Math.min(finalConfig.maxScore, score);

    const isAnomaly = score > 0;

    const stats: FragmentationStats = {
      supplierId: contract.supplierId,
      agencyId: contract.agencyId,
      contractsIn30Days,
      isNearDispensaLimit,
      similarContracts,
      fragmentationFlags: flags,
    };

    const reason = isAnomaly
      ? flags.join("; ")
      : "Sem indícios de fracionamento";

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
   * Calculates fragmentation score and saves to database
   */
  async function calculateFragmentationScoreAndSave(
    contractId: string
  ): Promise<
    Result<
      {
        contractId: string;
        fragmentationScore: number;
        fragmentationReason: string;
      },
      AnomalyError
    >
  > {
    const result = await calculateFragmentationScore(contractId);

    if (!result.success) {
      return result;
    }

    const contract = await getContractForFragmentation(contractId);
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
      const currentScore = contract.anomalyScore;
      const newTotalScore =
        currentScore.valueScore +
        currentScore.amendmentScore +
        currentScore.concentrationScore +
        currentScore.durationScore +
        (currentScore.timingScore ?? 0) +
        (currentScore.roundNumberScore ?? 0) +
        result.data.score +
        (currentScore.descriptionScore ?? 0);
      const newCategory = calculateCategory(newTotalScore);

      await prisma.anomalyScore.update({
        where: { contractId },
        data: {
          fragmentationScore: result.data.score,
          fragmentationReason: result.data.reason,
          totalScore: newTotalScore,
          category: newCategory,
        },
      });

      console.log(
        `[Anomaly] ${contract.externalId}: Fragmentation score ${String(result.data.score)}/25 - ${result.data.reason}`
      );

      return {
        success: true,
        data: {
          contractId,
          fragmentationScore: result.data.score,
          fragmentationReason: result.data.reason,
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
   * Process a batch of contracts for fragmentation score
   */
  async function processFragmentationBatch(): Promise<
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
      `[Anomaly] Starting fragmentation score batch (batch size: ${String(finalConfig.batchSize)})`
    );

    const contracts = await getContractsForFragmentationScore(
      finalConfig.batchSize
    );

    if (contracts.length === 0) {
      console.log(
        "[Anomaly] No contracts pending fragmentation score calculation"
      );
      stats.finishedAt = new Date();
      return { success: true, data: stats };
    }

    console.log(
      `[Anomaly] Found ${String(contracts.length)} contracts to process for fragmentation score`
    );

    for (const contract of contracts) {
      const result = await calculateFragmentationScoreAndSave(contract.id);
      stats.processed++;

      if (result.success) {
        stats.calculated++;
        if (result.data.fragmentationScore > 0) {
          stats.anomaliesFound++;
        }
      } else {
        stats.errors++;
        stats.lastError = result.error.message;
        console.error(
          `[Anomaly] Error calculating fragmentation score for ${contract.externalId}: ${result.error.message}`
        );
      }
    }

    stats.finishedAt = new Date();

    console.log("[Anomaly] Fragmentation batch completed:");
    console.log(`  - Processed: ${String(stats.processed)}`);
    console.log(`  - Calculated: ${String(stats.calculated)}`);
    console.log(`  - Anomalies found: ${String(stats.anomaliesFound)}`);
    console.log(`  - Errors: ${String(stats.errors)}`);

    return { success: true, data: stats };
  }

  /**
   * Process all pending contracts for fragmentation score
   */
  async function processAllFragmentations(): Promise<
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

    console.log("[Anomaly] Starting full fragmentation score processing run");

    let hasMore = true;

    while (hasMore) {
      const batchResult = await processFragmentationBatch();

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

      const remaining = await prisma.anomalyScore.count({
        where: {
          fragmentationScore: null,
        },
      });

      hasMore = remaining > 0;

      if (hasMore) {
        console.log(
          `[Anomaly] ${String(remaining)} contracts remaining for fragmentation score`
        );
      }
    }

    stats.finishedAt = new Date();

    console.log("[Anomaly] Full fragmentation processing completed:");
    console.log(`  - Total processed: ${String(stats.processed)}`);
    console.log(`  - Total calculated: ${String(stats.calculated)}`);
    console.log(`  - Total anomalies found: ${String(stats.anomaliesFound)}`);
    console.log(`  - Total errors: ${String(stats.errors)}`);

    return { success: true, data: stats };
  }

  /**
   * Reset fragmentation scores for recalculation
   */
  async function resetFragmentationScores(): Promise<number> {
    const result = await prisma.anomalyScore.updateMany({
      data: {
        fragmentationScore: null,
        fragmentationReason: null,
      },
    });

    await recalculateAllTotals();

    console.log(
      `[Anomaly] Reset fragmentation scores for ${String(result.count)} contracts`
    );
    return result.count;
  }

  // ============================================
  // DESCRIPTION SCORE (LLM-based)
  // ============================================

  /**
   * Gets a contract for description analysis
   */
  async function getContractForDescription(contractId: string) {
    return prisma.contract.findUnique({
      where: { id: contractId },
      select: {
        id: true,
        externalId: true,
        object: true,
        summary: true,
        anomalyScore: true,
      },
    });
  }

  /**
   * Gets contracts that need description score calculation
   */
  async function getContractsForDescriptionScore(limit: number) {
    return prisma.contract.findMany({
      where: {
        anomalyScore: {
          descriptionScore: null,
        },
        object: {
          not: "",
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      take: limit,
      select: {
        id: true,
        externalId: true,
        object: true,
        summary: true,
      },
    });
  }

  /**
   * Vague terms that indicate generic descriptions
   */
  const VAGUE_TERMS = [
    "conforme proposta",
    "diversos",
    "vários",
    "serviços diversos",
    "materiais diversos",
    "conforme anexo",
    "conforme edital",
    "conforme contrato",
    "a definir",
    "outros",
  ];

  /**
   * Brand indicators
   */
  const BRAND_PATTERNS = [
    /marca\s+\w+/i,
    /modelo\s+\w+/i,
    /fabricante\s+\w+/i,
    /\b(dell|hp|lenovo|apple|samsung|microsoft|oracle|sap)\b/i,
  ];

  /**
   * Calculates the description score for a contract using heuristics
   * (LLM version can be added later for more accurate analysis)
   */
  async function calculateDescriptionScore(
    contractId: string
  ): Promise<Result<DescriptionScoreResult, AnomalyError>> {
    const contract = await getContractForDescription(contractId);

    if (!contract) {
      return {
        success: false,
        error: {
          code: "INVALID_CONTRACT",
          message: `Contract not found: ${contractId}`,
        },
      };
    }

    const object = contract.object ?? "";
    const flags: string[] = [];
    let score = 0;

    const objectLength = object.length;

    // Check if too short/generic
    const isTooGeneric = objectLength < 50;
    if (isTooGeneric) {
      score += 10;
      flags.push(`Descrição muito curta (${String(objectLength)} caracteres)`);
    }

    // Check for vague terms
    const objectLower = object.toLowerCase();
    const hasVagueTerms = VAGUE_TERMS.some((term) =>
      objectLower.includes(term)
    );
    if (hasVagueTerms) {
      score += 5;
      flags.push("Contém termos vagos");
    }

    // Check for brand mentions (potential direcionamento)
    let hasSpecificBrand = false;
    for (const pattern of BRAND_PATTERNS) {
      if (pattern.test(object)) {
        hasSpecificBrand = true;
        break;
      }
    }
    if (hasSpecificBrand) {
      score += 10;
      flags.push("Menção a marca específica (possível direcionamento)");
    }

    // Check if overly specific (very long descriptions might be trying to exclude competitors)
    const isOverlySpecific = objectLength > 2000;
    if (isOverlySpecific) {
      score += 5;
      flags.push(
        "Descrição excessivamente detalhada (possível direcionamento)"
      );
    }

    // Cap at 25
    score = Math.min(finalConfig.maxScore, score);

    const isAnomaly = score > 0;

    const stats: DescriptionStats = {
      objectLength,
      isTooGeneric,
      hasSpecificBrand,
      hasVagueTerms,
      isOverlySpecific,
      descriptionFlags: flags,
    };

    const reason = isAnomaly ? flags.join("; ") : "Descrição adequada";

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
   * Calculates description score and saves to database
   */
  async function calculateDescriptionScoreAndSave(contractId: string): Promise<
    Result<
      {
        contractId: string;
        descriptionScore: number;
        descriptionReason: string;
      },
      AnomalyError
    >
  > {
    const result = await calculateDescriptionScore(contractId);

    if (!result.success) {
      return result;
    }

    const contract = await getContractForDescription(contractId);
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
      const currentScore = contract.anomalyScore;
      const newTotalScore =
        currentScore.valueScore +
        currentScore.amendmentScore +
        currentScore.concentrationScore +
        currentScore.durationScore +
        (currentScore.timingScore ?? 0) +
        (currentScore.roundNumberScore ?? 0) +
        (currentScore.fragmentationScore ?? 0) +
        result.data.score;
      const newCategory = calculateCategory(newTotalScore);

      await prisma.anomalyScore.update({
        where: { contractId },
        data: {
          descriptionScore: result.data.score,
          descriptionReason: result.data.reason,
          totalScore: newTotalScore,
          category: newCategory,
        },
      });

      console.log(
        `[Anomaly] ${contract.externalId}: Description score ${String(result.data.score)}/25 - ${result.data.reason}`
      );

      return {
        success: true,
        data: {
          contractId,
          descriptionScore: result.data.score,
          descriptionReason: result.data.reason,
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
   * Process a batch of contracts for description score
   */
  async function processDescriptionBatch(): Promise<
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
      `[Anomaly] Starting description score batch (batch size: ${String(finalConfig.batchSize)})`
    );

    const contracts = await getContractsForDescriptionScore(
      finalConfig.batchSize
    );

    if (contracts.length === 0) {
      console.log(
        "[Anomaly] No contracts pending description score calculation"
      );
      stats.finishedAt = new Date();
      return { success: true, data: stats };
    }

    console.log(
      `[Anomaly] Found ${String(contracts.length)} contracts to process for description score`
    );

    for (const contract of contracts) {
      const result = await calculateDescriptionScoreAndSave(contract.id);
      stats.processed++;

      if (result.success) {
        stats.calculated++;
        if (result.data.descriptionScore > 0) {
          stats.anomaliesFound++;
        }
      } else {
        stats.errors++;
        stats.lastError = result.error.message;
        console.error(
          `[Anomaly] Error calculating description score for ${contract.externalId}: ${result.error.message}`
        );
      }
    }

    stats.finishedAt = new Date();

    console.log("[Anomaly] Description batch completed:");
    console.log(`  - Processed: ${String(stats.processed)}`);
    console.log(`  - Calculated: ${String(stats.calculated)}`);
    console.log(`  - Anomalies found: ${String(stats.anomaliesFound)}`);
    console.log(`  - Errors: ${String(stats.errors)}`);

    return { success: true, data: stats };
  }

  /**
   * Process all pending contracts for description score
   */
  async function processAllDescriptions(): Promise<
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

    console.log("[Anomaly] Starting full description score processing run");

    let hasMore = true;

    while (hasMore) {
      const batchResult = await processDescriptionBatch();

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

      const remaining = await prisma.anomalyScore.count({
        where: {
          descriptionScore: null,
          contract: {
            object: { not: "" },
          },
        },
      });

      hasMore = remaining > 0;

      if (hasMore) {
        console.log(
          `[Anomaly] ${String(remaining)} contracts remaining for description score`
        );
      }
    }

    stats.finishedAt = new Date();

    console.log("[Anomaly] Full description processing completed:");
    console.log(`  - Total processed: ${String(stats.processed)}`);
    console.log(`  - Total calculated: ${String(stats.calculated)}`);
    console.log(`  - Total anomalies found: ${String(stats.anomaliesFound)}`);
    console.log(`  - Total errors: ${String(stats.errors)}`);

    return { success: true, data: stats };
  }

  /**
   * Reset description scores for recalculation
   */
  async function resetDescriptionScores(): Promise<number> {
    const result = await prisma.anomalyScore.updateMany({
      data: {
        descriptionScore: null,
        descriptionReason: null,
      },
    });

    await recalculateAllTotals();

    console.log(
      `[Anomaly] Reset description scores for ${String(result.count)} contracts`
    );
    return result.count;
  }

  /**
   * Helper function to recalculate all totals after a reset
   */
  async function recalculateAllTotals(): Promise<void> {
    const scores = await prisma.anomalyScore.findMany({
      select: {
        contractId: true,
        valueScore: true,
        amendmentScore: true,
        concentrationScore: true,
        durationScore: true,
        timingScore: true,
        roundNumberScore: true,
        fragmentationScore: true,
        descriptionScore: true,
      },
    });

    for (const score of scores) {
      const newTotal =
        score.valueScore +
        score.amendmentScore +
        score.concentrationScore +
        score.durationScore +
        (score.timingScore ?? 0) +
        (score.roundNumberScore ?? 0) +
        (score.fragmentationScore ?? 0) +
        (score.descriptionScore ?? 0);
      const newCategory = calculateCategory(newTotal);

      await prisma.anomalyScore.update({
        where: { contractId: score.contractId },
        data: {
          totalScore: newTotal,
          category: newCategory,
        },
      });
    }
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
    // Duration score (US-013)
    calculateDurationScore,
    calculateDurationScoreAndSave,
    getDurationCategoryStats,
    processDurationBatch,
    processAllDurations,
    resetDurationScores,
    recalculateDurationScore,
    // Consolidated score (US-014)
    getConsolidatedScore,
    consolidateAndSave,
    consolidateAll,
    getContractsByScore,
    getConsolidatedStats,
    // Round Number score
    calculateRoundNumberScore,
    calculateRoundNumberScoreAndSave,
    processRoundNumberBatch,
    processAllRoundNumbers,
    resetRoundNumberScores,
    // Timing score
    calculateTimingScore,
    calculateTimingScoreAndSave,
    processTimingBatch,
    processAllTimings,
    resetTimingScores,
    // Fragmentation score
    calculateFragmentationScore,
    calculateFragmentationScoreAndSave,
    processFragmentationBatch,
    processAllFragmentations,
    resetFragmentationScores,
    // Description score
    calculateDescriptionScore,
    calculateDescriptionScoreAndSave,
    processDescriptionBatch,
    processAllDescriptions,
    resetDescriptionScores,
    // Helpers
    recalculateAllTotals,
    config: finalConfig,
  };
}

export type AnomalyService = ReturnType<typeof createAnomalyService>;
