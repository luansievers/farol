/**
 * PNCP Detail Client - fetches contract details and files
 */

import { sleep } from "@shared/utils/index.js";
import type { Result } from "@shared/types/index.js";
import type {
  CrawlerConfig,
  CrawlerError,
  PncpContractDetailResponse,
  PncpContractFile,
} from "./types/index.js";

const DEFAULT_BASE_URL = "https://pncp.gov.br/api/consulta/v1";

const DEFAULT_CONFIG: Partial<CrawlerConfig> = {
  baseUrl: DEFAULT_BASE_URL,
  rateLimitMs: 1000,
  maxRetries: 3,
  timeout: 30000,
};

/**
 * Tracks last request timestamp for rate limiting
 */
let lastRequestTime = 0;

/**
 * Creates a PNCP detail client for fetching contract details
 */
export function createDetailClient(config: Partial<CrawlerConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  /**
   * Enforces rate limit by delaying if necessary
   */
  async function enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    const rateLimitMs = finalConfig.rateLimitMs ?? 1000;

    if (elapsed < rateLimitMs) {
      await sleep(rateLimitMs - elapsed);
    }

    lastRequestTime = Date.now();
  }

  /**
   * Makes a request with retries
   */
  async function fetchWithRetry<T>(
    url: string,
    retries = finalConfig.maxRetries ?? 3
  ): Promise<Result<T, CrawlerError>> {
    await enforceRateLimit();

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, finalConfig.timeout ?? 30000);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            "User-Agent": "Farol-Radar-Contratos/1.0",
          },
        });

        clearTimeout(timeoutId);

        if (response.status === 429) {
          const retryAfter = parseInt(
            response.headers.get("Retry-After") ?? "60",
            10
          );
          console.warn(
            `[DetailClient] Rate limited. Waiting ${String(retryAfter)}s before retry ${String(attempt)}/${String(retries)}`
          );
          await sleep(retryAfter * 1000);
          continue;
        }

        if (response.status === 404) {
          return {
            success: false,
            error: {
              code: "API_ERROR",
              message: "Contract not found",
              details: { status: 404, url },
            },
          };
        }

        if (!response.ok) {
          const errorText = await response.text().catch(() => "Unknown error");
          return {
            success: false,
            error: {
              code: "API_ERROR",
              message: `API returned ${String(response.status)}: ${errorText}`,
              details: { status: response.status, url },
            },
          };
        }

        const data = (await response.json()) as T;
        return { success: true, data };
      } catch (err) {
        const isTimeout = err instanceof Error && err.name === "AbortError";
        const isLastAttempt = attempt === retries;

        if (isLastAttempt) {
          return {
            success: false,
            error: {
              code: isTimeout ? "TIMEOUT" : "NETWORK_ERROR",
              message: err instanceof Error ? err.message : "Unknown error",
              details: { attempt, url },
            },
          };
        }

        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 30000);
        console.warn(
          `[DetailClient] Request failed (attempt ${String(attempt)}/${String(retries)}). Retrying in ${String(backoffMs)}ms...`
        );
        await sleep(backoffMs);
      }
    }

    return {
      success: false,
      error: {
        code: "NETWORK_ERROR",
        message: "Max retries exceeded",
      },
    };
  }

  /**
   * Downloads binary content (PDF) with retries
   */
  async function downloadBinary(
    url: string,
    retries = finalConfig.maxRetries ?? 3
  ): Promise<Result<Buffer, CrawlerError>> {
    await enforceRateLimit();

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => {
            controller.abort();
          },
          (finalConfig.timeout ?? 30000) * 2
        ); // Double timeout for downloads

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Farol-Radar-Contratos/1.0",
          },
        });

        clearTimeout(timeoutId);

        if (response.status === 429) {
          const retryAfter = parseInt(
            response.headers.get("Retry-After") ?? "60",
            10
          );
          console.warn(
            `[DetailClient] Rate limited. Waiting ${String(retryAfter)}s before retry ${String(attempt)}/${String(retries)}`
          );
          await sleep(retryAfter * 1000);
          continue;
        }

        if (response.status === 404) {
          return {
            success: false,
            error: {
              code: "API_ERROR",
              message: "File not found",
              details: { status: 404, url },
            },
          };
        }

        if (!response.ok) {
          return {
            success: false,
            error: {
              code: "API_ERROR",
              message: `Download failed with status ${String(response.status)}`,
              details: { status: response.status, url },
            },
          };
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        return { success: true, data: buffer };
      } catch (err) {
        const isTimeout = err instanceof Error && err.name === "AbortError";
        const isLastAttempt = attempt === retries;

        if (isLastAttempt) {
          return {
            success: false,
            error: {
              code: isTimeout ? "TIMEOUT" : "NETWORK_ERROR",
              message: err instanceof Error ? err.message : "Unknown error",
              details: { attempt, url },
            },
          };
        }

        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 30000);
        console.warn(
          `[DetailClient] Download failed (attempt ${String(attempt)}/${String(retries)}). Retrying in ${String(backoffMs)}ms...`
        );
        await sleep(backoffMs);
      }
    }

    return {
      success: false,
      error: {
        code: "NETWORK_ERROR",
        message: "Max retries exceeded",
      },
    };
  }

  /**
   * Fetches contract details from PNCP API
   * @param externalId - The numeroControlePNCP of the contract
   */
  async function fetchContractDetail(
    externalId: string
  ): Promise<Result<PncpContractDetailResponse, CrawlerError>> {
    const baseUrl = finalConfig.baseUrl ?? DEFAULT_BASE_URL;
    const url = `${baseUrl}/contratos/${externalId}`;
    console.log(`[DetailClient] Fetching detail: ${url}`);

    return fetchWithRetry<PncpContractDetailResponse>(url);
  }

  /**
   * Fetches contract files (including PDFs) from PNCP API
   * @param externalId - The numeroControlePNCP of the contract
   */
  async function fetchContractFiles(
    externalId: string
  ): Promise<Result<PncpContractFile[], CrawlerError>> {
    const baseUrl = finalConfig.baseUrl ?? DEFAULT_BASE_URL;
    const url = `${baseUrl}/contratos/${externalId}/arquivos`;
    console.log(`[DetailClient] Fetching files: ${url}`);

    const result = await fetchWithRetry<PncpContractFile[]>(url);

    if (!result.success) {
      // Files endpoint may return 404 if no files exist
      if (result.error.message === "Contract not found") {
        return { success: true, data: [] };
      }
      return result;
    }

    return result;
  }

  /**
   * Downloads a PDF file
   * @param fileUrl - The URL of the file to download
   */
  async function downloadFile(
    fileUrl: string
  ): Promise<Result<Buffer, CrawlerError>> {
    console.log(`[DetailClient] Downloading: ${fileUrl}`);
    return downloadBinary(fileUrl);
  }

  /**
   * Finds the main contract PDF from a list of files
   * Prioritizes files with type "CONTRATO" or similar
   */
  function findMainContractFile(
    files: PncpContractFile[]
  ): PncpContractFile | null {
    if (files.length === 0) return null;

    // Priority order for document types
    const priorityTypes = [
      "CONTRATO",
      "TERMO",
      "CONTRATO_ORIGINAL",
      "DOCUMENTO",
    ];

    for (const type of priorityTypes) {
      const file = files.find(
        (f) =>
          f.tipoDocumento.toUpperCase().includes(type) ||
          f.tipoDocumentoNome?.toUpperCase().includes(type)
      );
      if (file) return file;
    }

    // If no priority match, return the first PDF-like file
    const pdfFile = files.find(
      (f) => f.url.toLowerCase().endsWith(".pdf") || f.tipoDocumento === "PDF"
    );
    if (pdfFile) return pdfFile;

    // Last resort: return first file
    return files[0] ?? null;
  }

  return {
    fetchContractDetail,
    fetchContractFiles,
    downloadFile,
    findMainContractFile,
    config: finalConfig,
  };
}

export type DetailClient = ReturnType<typeof createDetailClient>;
