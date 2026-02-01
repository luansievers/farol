/**
 * PDF Downloader Service
 * Downloads contract PDFs and uploads to cloud storage
 */

import type { Result } from "@shared/types/index.js";
import type { StorageProvider, StorageError } from "@modules/storage/index.js";
import type { DetailClient } from "./detail-client.js";
import type { CrawlerError, NormalizedContractFile } from "./types/index.js";

export interface PdfDownloadResult {
  storagePath: string;
  originalUrl: string;
  fileSize: number;
}

export interface PdfDownloaderConfig {
  storagePrefix: string;
}

const DEFAULT_CONFIG: PdfDownloaderConfig = {
  storagePrefix: "contracts",
};

/**
 * Creates a PDF downloader service
 */
export function createPdfDownloader(
  detailClient: DetailClient,
  storage: StorageProvider,
  config: Partial<PdfDownloaderConfig> = {}
) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  /**
   * Generates a storage path for a contract PDF
   * Format: contracts/{year}/{month}/{externalId}.pdf
   */
  function generateStoragePath(
    externalId: string,
    signatureDate?: Date | null
  ): string {
    const date = signatureDate ?? new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");

    // Clean externalId for use as filename
    const cleanId = externalId.replace(/[^a-zA-Z0-9-]/g, "_");

    return `${finalConfig.storagePrefix}/${String(year)}/${month}/${cleanId}.pdf`;
  }

  /**
   * Downloads a PDF from URL and uploads to storage
   */
  async function downloadAndUpload(
    file: NormalizedContractFile,
    externalId: string,
    signatureDate?: Date | null
  ): Promise<Result<PdfDownloadResult, CrawlerError | StorageError>> {
    // Download the file
    const downloadResult = await detailClient.downloadFile(file.url);

    if (!downloadResult.success) {
      return downloadResult;
    }

    const buffer = downloadResult.data;
    const storagePath = generateStoragePath(externalId, signatureDate);

    // Upload to storage
    const uploadResult = await storage.upload(storagePath, buffer, {
      contentType: "application/pdf",
      metadata: {
        externalId,
        originalUrl: file.url,
        fileType: file.type,
        downloadedAt: new Date().toISOString(),
      },
    });

    if (!uploadResult.success) {
      return uploadResult;
    }

    console.log(
      `[PdfDownloader] Uploaded: ${storagePath} (${String(buffer.length)} bytes)`
    );

    return {
      success: true,
      data: {
        storagePath,
        originalUrl: file.url,
        fileSize: buffer.length,
      },
    };
  }

  /**
   * Downloads the main contract PDF and uploads to storage
   */
  async function downloadContractPdf(
    externalId: string,
    signatureDate?: Date | null
  ): Promise<Result<PdfDownloadResult, CrawlerError | StorageError>> {
    // Fetch available files
    const filesResult = await detailClient.fetchContractFiles(externalId);

    if (!filesResult.success) {
      return filesResult;
    }

    const files = filesResult.data;

    if (files.length === 0) {
      return {
        success: false,
        error: {
          code: "API_ERROR",
          message: "No files available for this contract",
          details: { externalId },
        },
      };
    }

    // Find the main contract file
    const mainFile = detailClient.findMainContractFile(files);

    if (!mainFile) {
      return {
        success: false,
        error: {
          code: "API_ERROR",
          message: "Could not identify main contract file",
          details: { externalId, availableFiles: files.length },
        },
      };
    }

    // Normalize file and download
    const normalizedFile: NormalizedContractFile = {
      sequence: mainFile.sequencialArquivo,
      type: mainFile.tipoDocumento,
      typeName: mainFile.tipoDocumentoNome ?? null,
      title: mainFile.titulo ?? null,
      url: mainFile.url,
      publishedAt: mainFile.dataPublicacao
        ? new Date(mainFile.dataPublicacao)
        : null,
    };

    return downloadAndUpload(normalizedFile, externalId, signatureDate);
  }

  /**
   * Checks if a contract PDF already exists in storage
   */
  async function pdfExists(
    externalId: string,
    signatureDate?: Date | null
  ): Promise<Result<boolean, StorageError>> {
    const storagePath = generateStoragePath(externalId, signatureDate);
    return storage.exists(storagePath);
  }

  return {
    downloadContractPdf,
    downloadAndUpload,
    pdfExists,
    generateStoragePath,
  };
}

export type PdfDownloader = ReturnType<typeof createPdfDownloader>;
