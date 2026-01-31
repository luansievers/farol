/**
 * Types for PNCP (Portal Nacional de Contratações Públicas) API
 * API Documentation: https://pncp.gov.br/api/consulta/swagger-ui/index.html
 */

/**
 * Raw contract response from PNCP API
 */
export interface PncpContractResponse {
  numeroControlePNCP: string;
  numeroControlePncpCompra: string | null;
  numeroContratoEmpenho: string;
  dataAssinatura: string;
  dataVigenciaInicio: string;
  dataVigenciaFim: string;
  dataAtualizacao: string;
  dataPublicacaoPncp: string;
  orgaoEntidade: {
    cnpj: string;
    razaoSocial: string;
    poderId: string;
    esferaId: string;
  };
  unidadeOrgao: {
    ufSigla: string;
    municipioNome: string;
    codigoIBGE: string;
    ufNome: string;
    codigoUnidade: string;
    nomeUnidade: string;
  };
  niFornecedor: string;
  nomeRazaoSocialFornecedor: string;
  codigoPaisFornecedor: string;
  categoriaProcesso: string;
  tipoContrato: string;
  objetoContrato: string;
  processo: string;
  valorInicial: number;
  valorParcela: number;
  valorGlobal: number;
  valorAcumulado: number;
  numeroParcelas: number;
  receita: boolean;
  numeroRetificacao: number;
  usuarioNome: string;
  linkContrato?: string;
}

/**
 * Paginated response from PNCP API
 */
export interface PncpPaginatedResponse {
  data: PncpContractResponse[];
  paginaAtual?: number;
  totalPaginas?: number;
  totalRegistros?: number;
  itensPorPagina?: number;
}

/**
 * Search parameters for PNCP API
 */
export interface PncpSearchParams {
  dataInicial: string; // YYYYMMDD
  dataFinal: string; // YYYYMMDD
  codigoMunicipio?: string; // IBGE code (São Paulo = 3550308)
  ufSigla?: string; // State code (e.g., "SP")
  cnpjOrgao?: string; // Agency CNPJ
  pagina?: number;
  tamanhoPagina?: number;
}

/**
 * Normalized contract data for internal use
 */
export interface NormalizedContract {
  externalId: string;
  number: string;
  object: string;
  value: number;
  signatureDate: Date | null;
  startDate: Date | null;
  endDate: Date | null;
  publicationDate: Date | null;
  modalidade: string | null;
  agency: {
    code: string;
    name: string;
    cnpj: string;
  };
  supplier: {
    cnpj: string;
    name: string;
  };
  pdfUrl: string | null;
  rawData: PncpContractResponse;
}

/**
 * Crawler execution statistics
 */
export interface CrawlerStats {
  startedAt: Date;
  finishedAt: Date | null;
  totalFound: number;
  newContracts: number;
  updatedContracts: number;
  errors: number;
  pages: number;
  lastError: string | null;
}

/**
 * Crawler configuration
 */
export interface CrawlerConfig {
  baseUrl: string;
  rateLimitMs: number; // Minimum delay between requests
  maxRetries: number;
  pageSize: number;
  timeout: number;
}

/**
 * Crawler error types
 */
export type CrawlerErrorCode =
  | "NETWORK_ERROR"
  | "RATE_LIMIT"
  | "API_ERROR"
  | "PARSE_ERROR"
  | "DATABASE_ERROR"
  | "TIMEOUT";

export interface CrawlerError {
  code: CrawlerErrorCode;
  message: string;
  details?: unknown;
}
