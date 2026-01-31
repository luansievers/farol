/**
 * Summary Service
 * Orchestrates AI-powered contract summary generation
 */

import { prisma } from "@modules/database/index.js";
import {
  createAIService,
  getAIConfig,
  validateAIConfig,
} from "@modules/ai/index.js";
import type { Result } from "@shared/types/index.js";
import type {
  SummaryConfig,
  SummaryError,
  SummaryStats,
  SummaryDatabaseStats,
  ContractSummary,
  AmendmentSummary,
  ComparisonContext,
} from "./types/index.js";
import { SYSTEM_PROMPT, buildUserPrompt, parseAIResponse } from "./prompts.js";

const DEFAULT_CONFIG: SummaryConfig = {
  batchSize: 10,
  maxTextLength: 15000, // ~4000 tokens approximately
  includeAmendments: true,
  includeComparison: true,
  maxRetries: 3,
};

/**
 * Creates the summary service
 */
export function createSummaryService(config: Partial<SummaryConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Validate AI config
  const aiValidation = validateAIConfig();
  if (!aiValidation.valid) {
    console.warn(
      "[Summary] AI configuration warnings:",
      aiValidation.errors.join(", ")
    );
  }

  const aiService = createAIService(getAIConfig());

  /**
   * Gets contracts ready for summary generation
   * (has extractedText but no summary)
   */
  async function getContractsForSummary(limit: number) {
    return prisma.contract.findMany({
      where: {
        extractedText: { not: null },
        NOT: { extractedText: { startsWith: "[EXTRACTION_FAILED]" } },
        summary: null,
      },
      orderBy: {
        createdAt: "asc",
      },
      take: limit,
      include: {
        agency: true,
        supplier: true,
        amendments: {
          orderBy: { number: "asc" },
        },
      },
    });
  }

  /**
   * Gets a single contract by ID for summary generation
   */
  async function getContractById(contractId: string) {
    return prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        agency: true,
        supplier: true,
        amendments: {
          orderBy: { number: "asc" },
        },
      },
    });
  }

  /**
   * Gets comparison context for a contract
   */
  async function getComparisonContext(
    category: string,
    contractValue: number
  ): Promise<ComparisonContext | null> {
    if (!finalConfig.includeComparison) {
      return null;
    }

    // Get similar contracts in the same category
    const similarContracts = await prisma.contract.findMany({
      where: {
        category: category as
          | "OBRAS"
          | "SERVICOS"
          | "TI"
          | "SAUDE"
          | "EDUCACAO"
          | "OUTROS",
        summary: { not: null },
      },
      select: {
        value: true,
      },
    });

    if (similarContracts.length < 3) {
      return null; // Not enough data for meaningful comparison
    }

    const values = similarContracts
      .map((c) => Number(c.value))
      .sort((a, b) => a - b);
    const total = values.reduce((sum, v) => sum + v, 0);
    const average = total / values.length;

    // Calculate percentile
    const belowCount = values.filter((v) => v < contractValue).length;
    const percentile = Math.round((belowCount / values.length) * 100);

    // Determine position description
    let position: string;
    if (percentile >= 75) {
      position = `Acima da média (top ${String(100 - percentile)}%)`;
    } else if (percentile >= 25) {
      position = `Próximo da média (percentil ${String(percentile)}%)`;
    } else {
      position = `Abaixo da média (bottom ${String(percentile)}%)`;
    }

    const avgFormatted = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(average);

    return {
      category,
      averageValue: avgFormatted,
      percentilePosition: position,
      similarContractsCount: similarContracts.length,
    };
  }

  /**
   * Builds the complete summary from AI response and contract data
   */
  function buildSummary(
    contract: NonNullable<Awaited<ReturnType<typeof getContractById>>>,
    parsedResponse: NonNullable<ReturnType<typeof parseAIResponse>>,
    comparison: ComparisonContext | null
  ): ContractSummary {
    const formatDate = (date: Date | null): string | null => {
      if (!date) return null;
      return new Intl.DateTimeFormat("pt-BR").format(date);
    };

    const value = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(contract.value));

    // Calculate duration in months
    let totalMonths: number | null = null;
    if (contract.startDate && contract.endDate) {
      const start = contract.startDate;
      const end = contract.endDate;
      const diffMs = end.getTime() - start.getTime();
      totalMonths = Math.round(diffMs / (1000 * 60 * 60 * 24 * 30));
    }

    // Build amendments summary
    let amendments: AmendmentSummary[] | null = null;
    if (finalConfig.includeAmendments && contract.amendments.length > 0) {
      amendments = contract.amendments.map((a) => ({
        number: a.number,
        type: a.type,
        description: a.description ?? "Sem descrição",
        valueChange: a.valueChange
          ? new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(Number(a.valueChange))
          : null,
        durationChange: a.durationChange
          ? `${String(a.durationChange)} dias`
          : null,
      }));
    }

    // Use AI-parsed amendments if available and contract has no amendments
    if (!amendments && parsedResponse.amendments) {
      amendments = parsedResponse.amendments;
    }

    return {
      objectSimplified: parsedResponse.objectSimplified,
      value,
      parties: {
        agency: contract.agency.acronym
          ? `${contract.agency.name} (${contract.agency.acronym})`
          : contract.agency.name,
        supplier: `${contract.supplier.tradeName} - CNPJ: ${contract.supplier.cnpj}`,
      },
      duration: {
        startDate: formatDate(contract.startDate),
        endDate: formatDate(contract.endDate),
        totalMonths,
      },
      mainConditions: parsedResponse.mainConditions,
      amendments,
      comparison,
      generatedAt: new Date(),
    };
  }

  /**
   * Generates summary for a single contract
   */
  async function generateSummary(
    contractId: string
  ): Promise<Result<ContractSummary, SummaryError>> {
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

    if (!contract.extractedText) {
      return {
        success: false,
        error: {
          code: "NO_TEXT",
          message: "Contract has no extracted text",
        },
      };
    }

    if (contract.extractedText.startsWith("[EXTRACTION_FAILED]")) {
      return {
        success: false,
        error: {
          code: "NO_TEXT",
          message: "Contract text extraction failed previously",
        },
      };
    }

    // Truncate text if too long
    const truncatedText =
      contract.extractedText.length > finalConfig.maxTextLength
        ? contract.extractedText.slice(0, finalConfig.maxTextLength) +
          "\n[... texto truncado ...]"
        : contract.extractedText;

    // Get comparison context
    const comparison = await getComparisonContext(
      contract.category,
      Number(contract.value)
    );

    // Build prompt
    const userPrompt = buildUserPrompt({
      contract,
      extractedText: truncatedText,
      comparison: comparison
        ? {
            categoryAverage: parseFloat(
              comparison.averageValue.replace(/[^\d,]/g, "").replace(",", ".")
            ),
            percentile: parseInt(
              /\d+/.exec(comparison.percentilePosition)?.[0] ?? "50",
              10
            ),
            similarCount: comparison.similarContractsCount,
          }
        : undefined,
    });

    // Update processing status
    await prisma.contract.update({
      where: { id: contractId },
      data: { processingStatus: "GENERATING_SUMMARY" },
    });

    // Call AI
    const aiResult = await aiService.complete({
      prompt: userPrompt,
      systemPrompt: SYSTEM_PROMPT,
      maxTokens: 2000,
      temperature: 0.3, // Lower temperature for more consistent output
    });

    if (!aiResult.success) {
      await prisma.contract.update({
        where: { id: contractId },
        data: { processingStatus: "FAILED" },
      });

      return {
        success: false,
        error: {
          code: "AI_ERROR",
          message: aiResult.error.message,
          details: aiResult.error,
        },
      };
    }

    // Parse AI response
    const parsed = parseAIResponse(aiResult.data.content);

    if (!parsed) {
      await prisma.contract.update({
        where: { id: contractId },
        data: { processingStatus: "FAILED" },
      });

      return {
        success: false,
        error: {
          code: "GENERATION_FAILED",
          message: "Failed to parse AI response",
          details: { rawResponse: aiResult.data.content },
        },
      };
    }

    // Build complete summary
    const summary = buildSummary(contract, parsed, comparison);

    // Save to database
    try {
      await prisma.contract.update({
        where: { id: contractId },
        data: {
          summary: JSON.stringify(summary),
          summaryGeneratedAt: new Date(),
          processingStatus: "COMPLETED",
        },
      });
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

    console.log(
      `[Summary] Generated summary for contract ${contract.externalId} ` +
        `(${contract.agency.acronym ?? contract.agency.name})`
    );

    return { success: true, data: summary };
  }

  /**
   * Regenerates summary for a contract (force regeneration)
   */
  async function regenerateSummary(
    contractId: string
  ): Promise<Result<ContractSummary, SummaryError>> {
    // Clear existing summary first
    await prisma.contract.update({
      where: { id: contractId },
      data: {
        summary: null,
        summaryGeneratedAt: null,
      },
    });

    return generateSummary(contractId);
  }

  /**
   * Processes a batch of contracts
   */
  async function processBatch(): Promise<Result<SummaryStats, SummaryError>> {
    const stats: SummaryStats = {
      startedAt: new Date(),
      finishedAt: null,
      processed: 0,
      generated: 0,
      errors: 0,
      lastError: null,
    };

    console.log(
      `[Summary] Starting batch processing (batch size: ${String(finalConfig.batchSize)})`
    );

    const contracts = await getContractsForSummary(finalConfig.batchSize);

    if (contracts.length === 0) {
      console.log("[Summary] No contracts ready for summary generation");
      stats.finishedAt = new Date();
      return { success: true, data: stats };
    }

    console.log(
      `[Summary] Found ${String(contracts.length)} contracts for summary generation`
    );

    for (const contract of contracts) {
      const result = await generateSummary(contract.id);
      stats.processed++;

      if (result.success) {
        stats.generated++;
      } else {
        stats.errors++;
        stats.lastError = result.error.message;
        console.error(
          `[Summary] Error generating summary for ${contract.externalId}: ${result.error.message}`
        );
      }
    }

    stats.finishedAt = new Date();

    console.log("[Summary] Batch completed:");
    console.log(`  - Processed: ${String(stats.processed)}`);
    console.log(`  - Generated: ${String(stats.generated)}`);
    console.log(`  - Errors: ${String(stats.errors)}`);

    // Log AI usage stats
    aiService.logStats();

    return { success: true, data: stats };
  }

  /**
   * Processes all contracts ready for summary generation
   */
  async function processAll(): Promise<Result<SummaryStats, SummaryError>> {
    const stats: SummaryStats = {
      startedAt: new Date(),
      finishedAt: null,
      processed: 0,
      generated: 0,
      errors: 0,
      lastError: null,
    };

    console.log("[Summary] Starting full processing run");

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
      stats.generated += batchStats.generated;
      stats.errors += batchStats.errors;

      if (batchStats.lastError) {
        stats.lastError = batchStats.lastError;
      }

      // Check if there are more contracts to process
      const remaining = await prisma.contract.count({
        where: {
          extractedText: { not: null },
          NOT: { extractedText: { startsWith: "[EXTRACTION_FAILED]" } },
          summary: null,
        },
      });

      hasMore = remaining > 0;

      if (hasMore) {
        console.log(`[Summary] ${String(remaining)} contracts remaining`);
      }
    }

    stats.finishedAt = new Date();

    console.log("[Summary] Full processing completed:");
    console.log(`  - Total processed: ${String(stats.processed)}`);
    console.log(`  - Total generated: ${String(stats.generated)}`);
    console.log(`  - Total errors: ${String(stats.errors)}`);

    // Log final AI usage stats
    aiService.logStats();

    return { success: true, data: stats };
  }

  /**
   * Gets summary generation statistics
   */
  async function getStats(): Promise<SummaryDatabaseStats> {
    const [ready, generated, failed] = await Promise.all([
      prisma.contract.count({
        where: {
          extractedText: { not: null },
          NOT: { extractedText: { startsWith: "[EXTRACTION_FAILED]" } },
          summary: null,
        },
      }),
      prisma.contract.count({
        where: {
          summary: { not: null },
        },
      }),
      prisma.contract.count({
        where: {
          processingStatus: "FAILED",
          extractedText: { not: null },
          NOT: { extractedText: { startsWith: "[EXTRACTION_FAILED]" } },
        },
      }),
    ]);

    return {
      ready,
      generated,
      failed,
      total: ready + generated + failed,
    };
  }

  /**
   * Resets failed summaries to retry
   */
  async function resetFailed(): Promise<number> {
    const result = await prisma.contract.updateMany({
      where: {
        processingStatus: "FAILED",
        extractedText: { not: null },
        NOT: { extractedText: { startsWith: "[EXTRACTION_FAILED]" } },
      },
      data: {
        summary: null,
        summaryGeneratedAt: null,
        processingStatus: "COMPLETED",
      },
    });

    console.log(
      `[Summary] Reset ${String(result.count)} failed summaries for retry`
    );
    return result.count;
  }

  /**
   * Gets parsed summary for a contract
   */
  async function getSummary(
    contractId: string
  ): Promise<Result<ContractSummary, SummaryError>> {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      select: { summary: true },
    });

    if (!contract) {
      return {
        success: false,
        error: {
          code: "INVALID_CONTRACT",
          message: `Contract not found: ${contractId}`,
        },
      };
    }

    if (!contract.summary) {
      return {
        success: false,
        error: {
          code: "NO_TEXT",
          message: "Contract has no summary",
        },
      };
    }

    try {
      const summary = JSON.parse(contract.summary) as ContractSummary;
      return { success: true, data: summary };
    } catch {
      return {
        success: false,
        error: {
          code: "GENERATION_FAILED",
          message: "Failed to parse stored summary",
        },
      };
    }
  }

  return {
    generateSummary,
    regenerateSummary,
    processBatch,
    processAll,
    getStats,
    resetFailed,
    getSummary,
    config: finalConfig,
  };
}

export type SummaryService = ReturnType<typeof createSummaryService>;
