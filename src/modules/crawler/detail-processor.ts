/**
 * Detail Processor Service
 * Processes pending contracts: fetches details, downloads PDFs, saves amendments
 */

import { Prisma } from "@/generated/prisma/client.js";
import { prisma } from "@modules/database/index.js";
import { getStorage, isStorageConfigured } from "@modules/storage/index.js";
import type { Result } from "@shared/types/index.js";
import { createDetailClient } from "./detail-client.js";
import { createPdfDownloader } from "./pdf-downloader.js";
import { normalizeContractDetail } from "./detail-normalizer.js";
import type {
  CrawlerError,
  DetailProcessorConfig,
  DetailProcessorStats,
  NormalizedContractDetail,
} from "./types/index.js";

const DEFAULT_CONFIG: DetailProcessorConfig = {
  batchSize: 10,
  rateLimitMs: 1000,
  maxRetries: 3,
  timeout: 30000,
  downloadPdfs: true,
  uploadToStorage: true,
};

/**
 * Creates the detail processor service
 */
export function createDetailProcessor(
  config: Partial<DetailProcessorConfig> = {}
) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const detailClient = createDetailClient({
    rateLimitMs: finalConfig.rateLimitMs,
    maxRetries: finalConfig.maxRetries,
    timeout: finalConfig.timeout,
  });

  /**
   * Gets contracts pending detail processing
   */
  async function getPendingContracts(limit: number) {
    return prisma.contract.findMany({
      where: {
        processingStatus: "PENDING",
      },
      orderBy: {
        createdAt: "asc",
      },
      take: limit,
      select: {
        id: true,
        externalId: true,
        signatureDate: true,
        pdfUrl: true,
      },
    });
  }

  /**
   * Updates contract processing status
   */
  async function updateProcessingStatus(
    contractId: string,
    status: "FETCHING_DETAILS" | "DOWNLOADING_PDF" | "COMPLETED" | "FAILED"
  ) {
    await prisma.contract.update({
      where: { id: contractId },
      data: { processingStatus: status },
    });
  }

  /**
   * Saves or updates amendments for a contract
   */
  async function saveAmendments(
    contractId: string,
    detail: NormalizedContractDetail
  ) {
    if (detail.amendments.length === 0) return;

    for (const amendment of detail.amendments) {
      const externalId = `${detail.externalId}-ADT-${String(amendment.sequence)}`;

      // Calculate net value change
      const valueChange =
        (amendment.valueIncrease ?? 0) - (amendment.valueDecrease ?? 0);

      // Calculate net duration change
      const durationChange =
        (amendment.durationIncrease ?? 0) - (amendment.durationDecrease ?? 0);

      await prisma.amendment.upsert({
        where: { externalId },
        create: {
          externalId,
          contractId,
          number: amendment.sequence,
          type: amendment.typeName ?? amendment.type ?? "UNKNOWN",
          description: amendment.justification,
          valueChange:
            valueChange !== 0 ? new Prisma.Decimal(valueChange) : null,
          durationChange: durationChange !== 0 ? durationChange : null,
          signatureDate: amendment.signatureDate,
        },
        update: {
          type: amendment.typeName ?? amendment.type ?? "UNKNOWN",
          description: amendment.justification,
          valueChange:
            valueChange !== 0 ? new Prisma.Decimal(valueChange) : null,
          durationChange: durationChange !== 0 ? durationChange : null,
          signatureDate: amendment.signatureDate,
        },
      });
    }

    console.log(
      `[DetailProcessor] Saved ${String(detail.amendments.length)} amendments for ${detail.externalId}`
    );
  }

  /**
   * Updates contract with detail information
   */
  async function updateContractDetails(
    contractId: string,
    detail: NormalizedContractDetail,
    storagePath?: string
  ) {
    await prisma.contract.update({
      where: { id: contractId },
      data: {
        object: detail.object,
        value: new Prisma.Decimal(detail.value),
        signatureDate: detail.signatureDate,
        startDate: detail.startDate,
        endDate: detail.endDate,
        publicationDate: detail.publicationDate,
        modalidade: detail.modalidade,
        ...(storagePath && { storagePath }),
        lastFetchedAt: new Date(),
      },
    });
  }

  /**
   * Processes a single contract: fetches details, downloads PDF, saves amendments
   */
  async function processContract(
    contractId: string,
    externalId: string,
    signatureDate: Date | null
  ): Promise<Result<void, CrawlerError>> {
    try {
      // Update status to FETCHING_DETAILS
      await updateProcessingStatus(contractId, "FETCHING_DETAILS");

      // Fetch contract details
      const detailResult = await detailClient.fetchContractDetail(externalId);

      if (!detailResult.success) {
        await updateProcessingStatus(contractId, "FAILED");
        return detailResult;
      }

      // Fetch files separately
      const filesResult = await detailClient.fetchContractFiles(externalId);
      const files = filesResult.success ? filesResult.data : [];

      // Normalize the detail
      const detail = normalizeContractDetail(detailResult.data, files);

      // Save amendments
      await saveAmendments(contractId, detail);

      let storagePath: string | undefined;

      // Download PDF if configured and storage is available
      if (
        finalConfig.downloadPdfs &&
        finalConfig.uploadToStorage &&
        isStorageConfigured()
      ) {
        await updateProcessingStatus(contractId, "DOWNLOADING_PDF");

        const storage = getStorage();
        const pdfDownloader = createPdfDownloader(detailClient, storage);

        const downloadResult = await pdfDownloader.downloadContractPdf(
          externalId,
          signatureDate
        );

        if (downloadResult.success) {
          storagePath = downloadResult.data.storagePath;
          console.log(`[DetailProcessor] PDF stored: ${storagePath}`);
        } else {
          // Log but don't fail - PDF download is optional
          console.warn(
            `[DetailProcessor] PDF download failed for ${externalId}: ${downloadResult.error.message}`
          );
        }
      }

      // Update contract details
      await updateContractDetails(contractId, detail, storagePath);

      // Mark as completed
      await updateProcessingStatus(contractId, "COMPLETED");

      console.log(`[DetailProcessor] Processed: ${externalId}`);
      return { success: true, data: undefined };
    } catch (err) {
      await updateProcessingStatus(contractId, "FAILED");
      return {
        success: false,
        error: {
          code: "DATABASE_ERROR",
          message: err instanceof Error ? err.message : "Unknown error",
          details: { externalId },
        },
      };
    }
  }

  /**
   * Processes a batch of pending contracts
   */
  async function processBatch(): Promise<
    Result<DetailProcessorStats, CrawlerError>
  > {
    const stats: DetailProcessorStats = {
      startedAt: new Date(),
      finishedAt: null,
      processed: 0,
      downloaded: 0,
      uploaded: 0,
      errors: 0,
      lastError: null,
    };

    console.log(
      `[DetailProcessor] Starting batch processing (batch size: ${String(finalConfig.batchSize)})`
    );

    const pendingContracts = await getPendingContracts(finalConfig.batchSize);

    if (pendingContracts.length === 0) {
      console.log("[DetailProcessor] No pending contracts to process");
      stats.finishedAt = new Date();
      return { success: true, data: stats };
    }

    console.log(
      `[DetailProcessor] Found ${String(pendingContracts.length)} pending contracts`
    );

    for (const contract of pendingContracts) {
      const result = await processContract(
        contract.id,
        contract.externalId,
        contract.signatureDate
      );

      if (result.success) {
        stats.processed++;
      } else {
        stats.errors++;
        stats.lastError = result.error.message;
        console.error(
          `[DetailProcessor] Error processing ${contract.externalId}: ${result.error.message}`
        );
      }
    }

    stats.finishedAt = new Date();

    console.log("[DetailProcessor] Batch completed:");
    console.log(`  - Processed: ${String(stats.processed)}`);
    console.log(`  - Errors: ${String(stats.errors)}`);

    return { success: true, data: stats };
  }

  /**
   * Processes all pending contracts in batches
   */
  async function processAll(): Promise<
    Result<DetailProcessorStats, CrawlerError>
  > {
    const stats: DetailProcessorStats = {
      startedAt: new Date(),
      finishedAt: null,
      processed: 0,
      downloaded: 0,
      uploaded: 0,
      errors: 0,
      lastError: null,
    };

    console.log("[DetailProcessor] Starting full processing run");

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
      stats.errors += batchStats.errors;

      if (batchStats.lastError) {
        stats.lastError = batchStats.lastError;
      }

      // Check if there are more contracts to process
      const remaining = await prisma.contract.count({
        where: { processingStatus: "PENDING" },
      });

      hasMore = remaining > 0;

      if (hasMore) {
        console.log(
          `[DetailProcessor] ${String(remaining)} contracts remaining`
        );
      }
    }

    stats.finishedAt = new Date();

    console.log("[DetailProcessor] Full processing completed:");
    console.log(`  - Total processed: ${String(stats.processed)}`);
    console.log(`  - Total errors: ${String(stats.errors)}`);

    return { success: true, data: stats };
  }

  /**
   * Gets processing statistics
   */
  async function getStats() {
    const [pending, completed, failed] = await Promise.all([
      prisma.contract.count({ where: { processingStatus: "PENDING" } }),
      prisma.contract.count({ where: { processingStatus: "COMPLETED" } }),
      prisma.contract.count({ where: { processingStatus: "FAILED" } }),
    ]);

    return { pending, completed, failed, total: pending + completed + failed };
  }

  /**
   * Resets failed contracts to pending status for retry
   */
  async function resetFailed(): Promise<number> {
    const result = await prisma.contract.updateMany({
      where: { processingStatus: "FAILED" },
      data: { processingStatus: "PENDING" },
    });

    console.log(
      `[DetailProcessor] Reset ${String(result.count)} failed contracts to pending`
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

export type DetailProcessor = ReturnType<typeof createDetailProcessor>;
