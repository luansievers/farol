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
  tipoContrato: string | { id: number; nome: string };
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

/**
 * Contract detail response from PNCP API
 */
export interface PncpContractDetailResponse {
  numeroControlePNCP: string;
  numeroContratoEmpenho: string;
  dataAssinatura: string;
  dataVigenciaInicio: string;
  dataVigenciaFim: string;
  dataPublicacaoPncp: string;
  valorInicial: number;
  valorGlobal: number;
  valorAcumulado: number;
  objetoContrato: string;
  tipoContrato: string | { id: number; nome: string };
  categoriaProcesso: string;
  processo: string;
  orgaoEntidade: {
    cnpj: string;
    razaoSocial: string;
    poderId: string;
    esferaId: string;
  };
  unidadeOrgao: {
    codigoUnidade: string;
    nomeUnidade: string;
    ufSigla: string;
    municipioNome: string;
    codigoIBGE: string;
  };
  niFornecedor: string;
  tipoPessoaFornecedor?: string;
  nomeRazaoSocialFornecedor: string;
  arquivos?: PncpContractFile[];
  historico?: PncpContractHistoryItem[];
}

/**
 * Contract file from PNCP API
 */
export interface PncpContractFile {
  sequencialArquivo: number;
  tipoDocumento: string;
  tipoDocumentoNome?: string;
  titulo?: string;
  url: string;
  dataPublicacao?: string;
}

/**
 * Contract history/amendment item from PNCP API
 */
export interface PncpContractHistoryItem {
  sequencialHistorico: number;
  dataAssinatura: string;
  dataVigenciaInicio?: string;
  dataVigenciaFim?: string;
  valorAcrescimo?: number;
  valorReducao?: number;
  prazoAcrescimoDias?: number;
  prazoReducaoDias?: number;
  tipoAlteracao?: string;
  tipoAlteracaoNome?: string;
  justificativa?: string;
  arquivos?: PncpContractFile[];
}

/**
 * Normalized contract detail for internal use
 */
export interface NormalizedContractDetail {
  externalId: string;
  number: string;
  object: string;
  value: number;
  signatureDate: Date | null;
  startDate: Date | null;
  endDate: Date | null;
  publicationDate: Date | null;
  modalidade: string | null;
  category: string | null;
  process: string | null;
  agency: {
    code: string;
    name: string;
    cnpj: string;
  };
  supplier: {
    cnpj: string;
    name: string;
    type: string | null;
  };
  files: NormalizedContractFile[];
  amendments: NormalizedAmendment[];
}

/**
 * Normalized contract file
 */
export interface NormalizedContractFile {
  sequence: number;
  type: string;
  typeName: string | null;
  title: string | null;
  url: string;
  publishedAt: Date | null;
}

/**
 * Normalized amendment data
 */
export interface NormalizedAmendment {
  sequence: number;
  signatureDate: Date | null;
  startDate: Date | null;
  endDate: Date | null;
  valueIncrease: number | null;
  valueDecrease: number | null;
  durationIncrease: number | null;
  durationDecrease: number | null;
  type: string | null;
  typeName: string | null;
  justification: string | null;
  files: NormalizedContractFile[];
}

/**
 * Detail processor statistics
 */
export interface DetailProcessorStats {
  startedAt: Date;
  finishedAt: Date | null;
  processed: number;
  downloaded: number;
  uploaded: number;
  errors: number;
  lastError: string | null;
}

/**
 * Detail processor configuration
 */
export interface DetailProcessorConfig {
  batchSize: number;
  rateLimitMs: number;
  maxRetries: number;
  timeout: number;
  downloadPdfs: boolean;
  uploadToStorage: boolean;
}
