/**
 * PDF Parser Service
 * Orchestrates PDF text extraction and database updates
 */

import { prisma } from "@modules/database/index.js";
import { getStorage, isStorageConfigured } from "@modules/storage/index.js";
import type { Result } from "@shared/types/index.js";
import { extractTextFromPdf } from "./pdf-extractor.js";
import { extractTextWithOcr } from "./ocr-extractor.js";
import type {
  ParserError,
  ParserConfig,
  ParserStats,
  ExtractionResult,
} from "./types/index.js";

const DEFAULT_CONFIG: ParserConfig = {
  batchSize: 10,
  ocrEnabled: true,
  ocrLanguage: "por",
  minTextLength: 50,
  maxRetries: 3,
};

/**
 * Creates the PDF parser service
 */
export function createParserService(config: Partial<ParserConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  /**
   * Gets contracts ready for text extraction
   * (COMPLETED status with storagePath but no extractedText)
   */
  async function getContractsForExtraction(limit: number) {
    return prisma.contract.findMany({
      where: {
        processingStatus: "COMPLETED",
        storagePath: { not: null },
        extractedText: null,
      },
      orderBy: {
        createdAt: "asc",
      },
      take: limit,
      select: {
        id: true,
        externalId: true,
        storagePath: true,
      },
    });
  }

  /**
   * Updates contract processing status
   */
  async function updateProcessingStatus(
    contractId: string,
    status: "EXTRACTING_TEXT" | "COMPLETED" | "FAILED"
  ) {
    await prisma.contract.update({
      where: { id: contractId },
      data: { processingStatus: status },
    });
  }

  /**
   * Saves extracted text to database
   */
  async function saveExtractedText(contractId: string, text: string) {
    await prisma.contract.update({
      where: { id: contractId },
      data: {
        extractedText: text,
        processingStatus: "COMPLETED",
      },
    });
  }

  /**
   * Marks contract as failed extraction for review
   */
  async function markExtractionFailed(contractId: string, reason: string) {
    await prisma.contract.update({
      where: { id: contractId },
      data: {
        processingStatus: "FAILED",
        // Store error reason in extractedText field with marker
        extractedText: `[EXTRACTION_FAILED] ${reason}`,
      },
    });
  }

  /**
   * Downloads PDF from storage
   */
  async function downloadPdf(
    storagePath: string
  ): Promise<Result<Buffer, ParserError>> {
    if (!isStorageConfigured()) {
      return {
        success: false,
        error: {
          code: "STORAGE_ERROR",
          message: "Storage is not configured",
        },
      };
    }

    const storage = getStorage();
    const result = await storage.download(storagePath);

    if (!result.success) {
      return {
        success: false,
        error: {
          code: "DOWNLOAD_FAILED",
          message: result.error.message,
          details: result.error,
        },
      };
    }

    return {
      success: true,
      data: result.data.content,
    };
  }

  /**
   * Extracts text from PDF, falling back to OCR if needed
   */
  async function extractText(
    pdfBuffer: Buffer
  ): Promise<Result<ExtractionResult, ParserError>> {
    // First, try pdf-parse (faster)
    const pdfResult = await extractTextFromPdf(pdfBuffer, {
      minTextLength: finalConfig.minTextLength,
    });

    if (pdfResult.success) {
      return pdfResult;
    }

    // If pdf-parse failed due to empty content and OCR is enabled, try OCR
    if (finalConfig.ocrEnabled && pdfResult.error.code === "EMPTY_CONTENT") {
      console.log("[Parser] PDF text extraction insufficient, trying OCR...");

      const ocrResult = await extractTextWithOcr(pdfBuffer, {
        language: finalConfig.ocrLanguage,
      });

      return ocrResult;
    }

    return pdfResult;
  }

  /**
   * Processes a single contract: downloads PDF, extracts text, saves to DB
   */
  async function processContract(
    contractId: string,
    externalId: string,
    storagePath: string
  ): Promise<Result<ExtractionResult, ParserError>> {
    try {
      // Update status to EXTRACTING_TEXT
      await updateProcessingStatus(contractId, "EXTRACTING_TEXT");

      // Download PDF from storage
      const downloadResult = await downloadPdf(storagePath);

      if (!downloadResult.success) {
        await markExtractionFailed(contractId, downloadResult.error.message);
        return downloadResult;
      }

      // Extract text
      const extractResult = await extractText(downloadResult.data);

      if (!extractResult.success) {
        await markExtractionFailed(contractId, extractResult.error.message);
        return extractResult;
      }

      // Save extracted text
      await saveExtractedText(contractId, extractResult.data.text);

      console.log(
        `[Parser] Extracted ${String(extractResult.data.text.length)} chars from ${externalId} ` +
          `(${extractResult.data.method}, ${String(extractResult.data.pageCount)} pages)`
      );

      return extractResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      await markExtractionFailed(contractId, errorMessage);

      return {
        success: false,
        error: {
          code: "DATABASE_ERROR",
          message: errorMessage,
          details: { externalId },
        },
      };
    }
  }

  /**
   * Processes a batch of contracts
   */
  async function processBatch(): Promise<Result<ParserStats, ParserError>> {
    const stats: ParserStats = {
      startedAt: new Date(),
      finishedAt: null,
      processed: 0,
      extracted: 0,
      ocrUsed: 0,
      errors: 0,
      lastError: null,
    };

    console.log(
      `[Parser] Starting batch processing (batch size: ${String(finalConfig.batchSize)})`
    );

    const contracts = await getContractsForExtraction(finalConfig.batchSize);

    if (contracts.length === 0) {
      console.log("[Parser] No contracts ready for text extraction");
      stats.finishedAt = new Date();
      return { success: true, data: stats };
    }

    console.log(
      `[Parser] Found ${String(contracts.length)} contracts for extraction`
    );

    for (const contract of contracts) {
      if (!contract.storagePath) continue;

      const result = await processContract(
        contract.id,
        contract.externalId,
        contract.storagePath
      );

      stats.processed++;

      if (result.success) {
        stats.extracted++;
        if (result.data.method === "ocr") {
          stats.ocrUsed++;
        }
      } else {
        stats.errors++;
        stats.lastError = result.error.message;
        console.error(
          `[Parser] Error extracting ${contract.externalId}: ${result.error.message}`
        );
      }
    }

    stats.finishedAt = new Date();

    console.log("[Parser] Batch completed:");
    console.log(`  - Processed: ${String(stats.processed)}`);
    console.log(`  - Extracted: ${String(stats.extracted)}`);
    console.log(`  - OCR used: ${String(stats.ocrUsed)}`);
    console.log(`  - Errors: ${String(stats.errors)}`);

    return { success: true, data: stats };
  }

  /**
   * Processes all contracts ready for extraction
   */
  async function processAll(): Promise<Result<ParserStats, ParserError>> {
    const stats: ParserStats = {
      startedAt: new Date(),
      finishedAt: null,
      processed: 0,
      extracted: 0,
      ocrUsed: 0,
      errors: 0,
      lastError: null,
    };

    console.log("[Parser] Starting full processing run");

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
      stats.extracted += batchStats.extracted;
      stats.ocrUsed += batchStats.ocrUsed;
      stats.errors += batchStats.errors;

      if (batchStats.lastError) {
        stats.lastError = batchStats.lastError;
      }

      // Check if there are more contracts to process
      const remaining = await prisma.contract.count({
        where: {
          processingStatus: "COMPLETED",
          storagePath: { not: null },
          extractedText: null,
        },
      });

      hasMore = remaining > 0;

      if (hasMore) {
        console.log(`[Parser] ${String(remaining)} contracts remaining`);
      }
    }

    stats.finishedAt = new Date();

    console.log("[Parser] Full processing completed:");
    console.log(`  - Total processed: ${String(stats.processed)}`);
    console.log(`  - Total extracted: ${String(stats.extracted)}`);
    console.log(`  - Total OCR used: ${String(stats.ocrUsed)}`);
    console.log(`  - Total errors: ${String(stats.errors)}`);

    return { success: true, data: stats };
  }

  /**
   * Gets extraction statistics
   */
  async function getStats() {
    const [ready, extracted, failed] = await Promise.all([
      prisma.contract.count({
        where: {
          processingStatus: "COMPLETED",
          storagePath: { not: null },
          extractedText: null,
        },
      }),
      prisma.contract.count({
        where: {
          extractedText: { not: null },
          NOT: { extractedText: { startsWith: "[EXTRACTION_FAILED]" } },
        },
      }),
      prisma.contract.count({
        where: {
          extractedText: { startsWith: "[EXTRACTION_FAILED]" },
        },
      }),
    ]);

    return {
      ready,
      extracted,
      failed,
      total: ready + extracted + failed,
    };
  }

  /**
   * Resets failed extractions to retry
   */
  async function resetFailed(): Promise<number> {
    const result = await prisma.contract.updateMany({
      where: {
        extractedText: { startsWith: "[EXTRACTION_FAILED]" },
      },
      data: {
        extractedText: null,
        processingStatus: "COMPLETED",
      },
    });

    console.log(
      `[Parser] Reset ${String(result.count)} failed extractions for retry`
    );
    return result.count;
  }

  return {
    processBatch,
    processAll,
    processContract,
    getStats,
    resetFailed,
    config: finalConfig,
  };
}

export type ParserService = ReturnType<typeof createParserService>;
