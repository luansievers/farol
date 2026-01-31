/**
 * Crawler module for PNCP (Portal Nacional de Contratações Públicas)
 * Fetches public contracts from São Paulo municipality
 */

export { createPncpClient, type PncpClient } from "./client.js";
export { normalizeContract, normalizeContracts } from "./normalizer.js";
export { createCrawlerService, type CrawlerService } from "./service.js";
export type {
  CrawlerConfig,
  CrawlerError,
  CrawlerErrorCode,
  CrawlerStats,
  NormalizedContract,
  PncpContractResponse,
  PncpPaginatedResponse,
  PncpSearchParams,
} from "./types/index.js";
