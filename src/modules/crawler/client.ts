/**
 * PNCP API Client with rate limiting
 */

import { sleep } from "@shared/utils/index.js";
import type { Result } from "@shared/types/index.js";
import type {
  CrawlerConfig,
  CrawlerError,
  PncpPaginatedResponse,
  PncpSearchParams,
} from "./types/index.js";

const DEFAULT_CONFIG: CrawlerConfig = {
  baseUrl: "https://pncp.gov.br/api/consulta/v1",
  rateLimitMs: 1000, // 1 second between requests
  maxRetries: 3,
  pageSize: 500,
  timeout: 30000, // 30 seconds
};

/**
 * Tracks last request timestamp for rate limiting
 */
let lastRequestTime = 0;

/**
 * Creates a rate-limited PNCP API client
 */
export function createPncpClient(config: Partial<CrawlerConfig> = {}) {
  const finalConfig: CrawlerConfig = { ...DEFAULT_CONFIG, ...config };

  /**
   * Enforces rate limit by delaying if necessary
   */
  async function enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - lastRequestTime;

    if (elapsed < finalConfig.rateLimitMs) {
      await sleep(finalConfig.rateLimitMs - elapsed);
    }

    lastRequestTime = Date.now();
  }

  /**
   * Makes a request to the PNCP API with retries
   */
  async function fetchWithRetry<T>(
    url: string,
    retries = finalConfig.maxRetries
  ): Promise<Result<T, CrawlerError>> {
    await enforceRateLimit();

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, finalConfig.timeout);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            "User-Agent": "Farol-Radar-Contratos/1.0",
          },
        });

        clearTimeout(timeoutId);

        if (response.status === 429) {
          // Rate limited - wait longer and retry
          const retryAfter = parseInt(
            response.headers.get("Retry-After") ?? "60",
            10
          );
          console.warn(
            `[Crawler] Rate limited. Waiting ${String(retryAfter)}s before retry ${String(attempt)}/${String(retries)}`
          );
          await sleep(retryAfter * 1000);
          continue;
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

        // Exponential backoff
        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 30000);
        console.warn(
          `[Crawler] Request failed (attempt ${String(attempt)}/${String(retries)}). Retrying in ${String(backoffMs)}ms...`
        );
        await sleep(backoffMs);
      }
    }

    // Should never reach here, but TypeScript needs it
    return {
      success: false,
      error: {
        code: "NETWORK_ERROR",
        message: "Max retries exceeded",
      },
    };
  }

  /**
   * Builds search URL with query parameters
   */
  function buildSearchUrl(params: PncpSearchParams): string {
    const url = new URL(`${finalConfig.baseUrl}/contratos`);

    url.searchParams.set("dataInicial", params.dataInicial);
    url.searchParams.set("dataFinal", params.dataFinal);
    url.searchParams.set("pagina", String(params.pagina ?? 1));
    url.searchParams.set(
      "tamanhoPagina",
      String(params.tamanhoPagina ?? finalConfig.pageSize)
    );

    if (params.codigoMunicipio) {
      url.searchParams.set("codigoMunicipio", params.codigoMunicipio);
    }

    if (params.ufSigla) {
      url.searchParams.set("ufSigla", params.ufSigla);
    }

    if (params.cnpjOrgao) {
      url.searchParams.set("cnpjOrgao", params.cnpjOrgao);
    }

    return url.toString();
  }

  /**
   * Fetches contracts from PNCP API
   */
  async function fetchContracts(
    params: PncpSearchParams
  ): Promise<Result<PncpPaginatedResponse, CrawlerError>> {
    const url = buildSearchUrl(params);
    console.log(`[Crawler] Fetching: ${url}`);

    const result = await fetchWithRetry<
      PncpPaginatedResponse | PncpPaginatedResponse["data"]
    >(url);

    if (!result.success) {
      return result;
    }

    // API sometimes returns array directly, sometimes wrapped in { data: [...] }
    const data = Array.isArray(result.data)
      ? { data: result.data }
      : result.data;

    return { success: true, data };
  }

  return {
    fetchContracts,
    config: finalConfig,
  };
}

export type PncpClient = ReturnType<typeof createPncpClient>;
