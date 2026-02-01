/**
 * Classification Service
 * Automatic contract classification with multiple strategies
 */

import { prisma } from "@modules/database/index.js";
import {
  createAIService,
  getAIConfig,
  validateAIConfig,
} from "@modules/ai/index.js";
import type { Result } from "@shared/types/index.js";
import type { ContractCategory } from "@/generated/prisma/client.js";
import type {
  ClassificationConfig,
  ClassificationError,
  ClassificationResult,
  ClassificationStats,
  ClassificationDatabaseStats,
  ClassificationSource,
} from "./types/index.js";
import { getCategoryFromKeywords } from "./mappings.js";
import {
  CLASSIFICATION_SYSTEM_PROMPT,
  buildClassificationPrompt,
  parseClassificationResponse,
} from "./prompts.js";

const DEFAULT_CONFIG: ClassificationConfig = {
  batchSize: 20,
  useAIFallback: true,
  maxTextLength: 3000,
};

/**
 * Creates the classification service
 */
export function createClassificationService(
  config: Partial<ClassificationConfig> = {}
) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Validate AI config if AI fallback is enabled
  let aiService: ReturnType<typeof createAIService> | null = null;

  if (finalConfig.useAIFallback) {
    const aiValidation = validateAIConfig();
    if (!aiValidation.valid) {
      console.warn(
        "[Classification] AI configuration warnings:",
        aiValidation.errors.join(", ")
      );
    }
    aiService = createAIService(getAIConfig());
  }

  /**
   * Gets contracts pending classification
   * (classifiedAt is null and categoryManual = false)
   */
  async function getContractsForClassification(limit: number) {
    return prisma.contract.findMany({
      where: {
        classifiedAt: null,
        categoryManual: false,
      },
      orderBy: {
        createdAt: "asc",
      },
      take: limit,
      include: {
        agency: true,
      },
    });
  }

  /**
   * Gets a single contract for classification
   */
  async function getContractById(contractId: string) {
    return prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        agency: true,
      },
    });
  }

  /**
   * Classify using AI
   */
  async function classifyWithAI(params: {
    objectDescription: string;
    extractedText?: string | null;
    value?: string;
    agencyName?: string;
  }): Promise<Result<ClassificationResult, ClassificationError>> {
    if (!aiService) {
      return {
        success: false,
        error: {
          code: "AI_ERROR",
          message: "AI service not configured",
        },
      };
    }

    const prompt = buildClassificationPrompt(params);

    const result = await aiService.complete({
      prompt,
      systemPrompt: CLASSIFICATION_SYSTEM_PROMPT,
      maxTokens: 200,
      temperature: 0.1, // Low temperature for consistent classification
    });

    if (!result.success) {
      return {
        success: false,
        error: {
          code: "AI_ERROR",
          message: result.error.message,
          details: result.error,
        },
      };
    }

    const parsed = parseClassificationResponse(result.data.content);

    if (!parsed) {
      return {
        success: false,
        error: {
          code: "CLASSIFICATION_FAILED",
          message: "Failed to parse AI classification response",
          details: { rawResponse: result.data.content },
        },
      };
    }

    return {
      success: true,
      data: {
        category: parsed.category,
        source: "ai" as ClassificationSource,
        confidence: parsed.confidence,
        reason: parsed.reason,
      },
    };
  }

  /**
   * Classify a single contract using the multi-strategy approach:
   * 1. Official expense nature code (if available)
   * 2. Keyword matching on object description
   * 3. AI classification (if enabled and other methods fail)
   */
  async function classifyContract(
    contractId: string
  ): Promise<Result<ClassificationResult, ClassificationError>> {
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

    // Skip manually classified contracts
    if (contract.categoryManual) {
      return {
        success: true,
        data: {
          category: contract.category,
          source: "manual",
          confidence: "high",
          reason: "Categoria definida manualmente",
        },
      };
    }

    // Strategy 1: Try official expense nature code
    // Note: This assumes there's a field like "naturezaDespesa" or similar
    // For now, we'll skip this as it's not in the current schema
    // const codeCategory = getCategoryFromExpenseCode(contract.naturezaDespesa);
    // if (codeCategory) {
    //   return {
    //     success: true,
    //     data: {
    //       category: codeCategory,
    //       source: "official_code",
    //       confidence: "high",
    //       reason: `Classificado pelo código de natureza de despesa`,
    //     },
    //   };
    // }

    // Strategy 2: Keyword matching on object description
    const keywordResult = getCategoryFromKeywords(contract.object);

    if (keywordResult && keywordResult.confidence !== "low") {
      return {
        success: true,
        data: {
          category: keywordResult.category,
          source: "keywords",
          confidence: keywordResult.confidence,
          reason: `Palavras-chave identificadas: ${keywordResult.matchedKeywords.join(", ")}`,
        },
      };
    }

    // Strategy 3: AI classification (if enabled)
    if (finalConfig.useAIFallback && aiService) {
      const formattedValue = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(Number(contract.value));

      const aiResult = await classifyWithAI({
        objectDescription: contract.object,
        extractedText: contract.extractedText,
        value: formattedValue,
        agencyName: contract.agency.name,
      });

      if (aiResult.success) {
        return aiResult;
      }

      // Log AI error but don't fail the classification
      console.warn(
        `[Classification] AI classification failed for ${contract.externalId}: ${aiResult.error.message}`
      );
    }

    // Fallback: Use low-confidence keyword match if available
    if (keywordResult) {
      return {
        success: true,
        data: {
          category: keywordResult.category,
          source: "keywords",
          confidence: "low",
          reason: `Palavras-chave identificadas (baixa confiança): ${keywordResult.matchedKeywords.join(", ")}`,
        },
      };
    }

    // No classification possible - keep as OUTROS
    return {
      success: true,
      data: {
        category: "OUTROS",
        source: "keywords",
        confidence: "low",
        reason: "Nenhuma categoria específica identificada",
      },
    };
  }

  /**
   * Classify and save result to database
   */
  async function classifyAndSave(
    contractId: string
  ): Promise<Result<ClassificationResult, ClassificationError>> {
    const result = await classifyContract(contractId);

    if (!result.success) {
      return result;
    }

    // Don't save if already manually classified
    if (result.data.source === "manual") {
      return result;
    }

    // Save to database (always mark as classified, even if category is OUTROS)
    try {
      await prisma.contract.update({
        where: { id: contractId },
        data: {
          category: result.data.category,
          categoryManual: false,
          classifiedAt: new Date(),
        },
      });

      const contract = await getContractById(contractId);
      console.log(
        `[Classification] ${contract?.externalId ?? contractId}: ${result.data.category} ` +
          `(${result.data.source}, ${result.data.confidence})`
      );
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

    return result;
  }

  /**
   * Manually set category for a contract
   */
  async function setManualCategory(
    contractId: string,
    category: ContractCategory
  ): Promise<Result<ClassificationResult, ClassificationError>> {
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
      await prisma.contract.update({
        where: { id: contractId },
        data: {
          category,
          categoryManual: true,
        },
      });

      console.log(
        `[Classification] ${contract.externalId}: Manually set to ${category}`
      );

      return {
        success: true,
        data: {
          category,
          source: "manual",
          confidence: "high",
          reason: "Categoria definida manualmente",
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
   * Process a batch of contracts
   */
  async function processBatch(): Promise<
    Result<ClassificationStats, ClassificationError>
  > {
    const stats: ClassificationStats = {
      startedAt: new Date(),
      finishedAt: null,
      processed: 0,
      classified: 0,
      errors: 0,
      bySource: {
        official_code: 0,
        keywords: 0,
        ai: 0,
      },
      byCategory: {
        OBRAS: 0,
        SERVICOS: 0,
        TI: 0,
        SAUDE: 0,
        EDUCACAO: 0,
        OUTROS: 0,
      },
      lastError: null,
    };

    console.log(
      `[Classification] Starting batch (batch size: ${String(finalConfig.batchSize)})`
    );

    const contracts = await getContractsForClassification(
      finalConfig.batchSize
    );

    if (contracts.length === 0) {
      console.log("[Classification] No contracts pending classification");
      stats.finishedAt = new Date();
      return { success: true, data: stats };
    }

    console.log(
      `[Classification] Found ${String(contracts.length)} contracts to classify`
    );

    for (const contract of contracts) {
      const result = await classifyAndSave(contract.id);
      stats.processed++;

      if (result.success) {
        if (result.data.category !== "OUTROS") {
          stats.classified++;
        }

        // Track source (only if not OUTROS)
        if (
          result.data.source !== "manual" &&
          result.data.category !== "OUTROS"
        ) {
          stats.bySource[result.data.source]++;
        }

        stats.byCategory[result.data.category]++;
      } else {
        stats.errors++;
        stats.lastError = result.error.message;
        console.error(
          `[Classification] Error classifying ${contract.externalId}: ${result.error.message}`
        );
      }
    }

    stats.finishedAt = new Date();

    console.log("[Classification] Batch completed:");
    console.log(`  - Processed: ${String(stats.processed)}`);
    console.log(`  - Classified: ${String(stats.classified)}`);
    console.log(`  - Errors: ${String(stats.errors)}`);
    console.log(
      `  - By source: keywords=${String(stats.bySource.keywords)}, ai=${String(stats.bySource.ai)}`
    );

    // Log AI usage stats if applicable
    if (aiService) {
      aiService.logStats();
    }

    return { success: true, data: stats };
  }

  /**
   * Process all pending contracts
   */
  async function processAll(): Promise<
    Result<ClassificationStats, ClassificationError>
  > {
    const stats: ClassificationStats = {
      startedAt: new Date(),
      finishedAt: null,
      processed: 0,
      classified: 0,
      errors: 0,
      bySource: {
        official_code: 0,
        keywords: 0,
        ai: 0,
      },
      byCategory: {
        OBRAS: 0,
        SERVICOS: 0,
        TI: 0,
        SAUDE: 0,
        EDUCACAO: 0,
        OUTROS: 0,
      },
      lastError: null,
    };

    console.log("[Classification] Starting full processing run");

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
      stats.classified += batchStats.classified;
      stats.errors += batchStats.errors;

      // Merge source counts
      stats.bySource.official_code += batchStats.bySource.official_code;
      stats.bySource.keywords += batchStats.bySource.keywords;
      stats.bySource.ai += batchStats.bySource.ai;

      // Merge category counts
      for (const cat of Object.keys(stats.byCategory) as ContractCategory[]) {
        stats.byCategory[cat] += batchStats.byCategory[cat];
      }

      if (batchStats.lastError) {
        stats.lastError = batchStats.lastError;
      }

      // Check if there are more contracts to process
      const remaining = await prisma.contract.count({
        where: {
          classifiedAt: null,
          categoryManual: false,
        },
      });

      hasMore = remaining > 0;

      if (hasMore) {
        console.log(
          `[Classification] ${String(remaining)} contracts remaining`
        );
      }
    }

    stats.finishedAt = new Date();

    console.log("[Classification] Full processing completed:");
    console.log(`  - Total processed: ${String(stats.processed)}`);
    console.log(`  - Total classified: ${String(stats.classified)}`);
    console.log(`  - Total errors: ${String(stats.errors)}`);

    // Log final AI usage stats
    if (aiService) {
      aiService.logStats();
    }

    return { success: true, data: stats };
  }

  /**
   * Get classification statistics
   */
  async function getStats(): Promise<ClassificationDatabaseStats> {
    const [pending, byCategory, manual] = await Promise.all([
      prisma.contract.count({
        where: {
          classifiedAt: null,
          categoryManual: false,
        },
      }),
      prisma.contract.groupBy({
        by: ["category"],
        _count: { category: true },
      }),
      prisma.contract.count({
        where: {
          categoryManual: true,
        },
      }),
    ]);

    const categoryCounts: Record<ContractCategory, number> = {
      OBRAS: 0,
      SERVICOS: 0,
      TI: 0,
      SAUDE: 0,
      EDUCACAO: 0,
      OUTROS: 0,
    };

    for (const item of byCategory) {
      categoryCounts[item.category] = item._count.category;
    }

    const classified =
      categoryCounts.OBRAS +
      categoryCounts.SERVICOS +
      categoryCounts.TI +
      categoryCounts.SAUDE +
      categoryCounts.EDUCACAO;

    const total = classified + categoryCounts.OUTROS;

    return {
      pending,
      classified,
      manual,
      total,
      byCategory: categoryCounts,
    };
  }

  /**
   * Reset category for non-manual contracts to allow re-classification
   */
  async function resetClassifications(): Promise<number> {
    const result = await prisma.contract.updateMany({
      where: {
        categoryManual: false,
        classifiedAt: { not: null },
      },
      data: {
        category: "OUTROS",
        classifiedAt: null,
      },
    });

    console.log(
      `[Classification] Reset ${String(result.count)} contracts for re-classification`
    );
    return result.count;
  }

  /**
   * Reclassify a specific contract
   */
  async function reclassify(
    contractId: string
  ): Promise<Result<ClassificationResult, ClassificationError>> {
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

    // Skip manually classified contracts
    if (contract.categoryManual) {
      return {
        success: false,
        error: {
          code: "INVALID_CONTRACT",
          message:
            "Cannot reclassify manually classified contract. Use setManualCategory to change it.",
        },
      };
    }

    // Reset classification
    await prisma.contract.update({
      where: { id: contractId },
      data: { category: "OUTROS", classifiedAt: null },
    });

    // Re-classify
    return classifyAndSave(contractId);
  }

  return {
    classifyContract,
    classifyAndSave,
    setManualCategory,
    processBatch,
    processAll,
    getStats,
    resetClassifications,
    reclassify,
    config: finalConfig,
  };
}

export type ClassificationService = ReturnType<
  typeof createClassificationService
>;
