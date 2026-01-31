/**
 * Normalizes PNCP contract detail responses to internal format
 */

import type {
  NormalizedContractDetail,
  NormalizedContractFile,
  NormalizedAmendment,
  PncpContractDetailResponse,
  PncpContractFile,
  PncpContractHistoryItem,
} from "./types/index.js";

/**
 * Parses ISO date string or returns null
 */
function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;

  try {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * Normalizes CNPJ by removing formatting
 */
function normalizeCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, "");
}

/**
 * Normalizes a contract file
 */
function normalizeFile(file: PncpContractFile): NormalizedContractFile {
  return {
    sequence: file.sequencialArquivo,
    type: file.tipoDocumento,
    typeName: file.tipoDocumentoNome ?? null,
    title: file.titulo ?? null,
    url: file.url,
    publishedAt: parseDate(file.dataPublicacao),
  };
}

/**
 * Normalizes a contract history item (amendment)
 */
function normalizeAmendment(
  item: PncpContractHistoryItem
): NormalizedAmendment {
  return {
    sequence: item.sequencialHistorico,
    signatureDate: parseDate(item.dataAssinatura),
    startDate: parseDate(item.dataVigenciaInicio),
    endDate: parseDate(item.dataVigenciaFim),
    valueIncrease: item.valorAcrescimo ?? null,
    valueDecrease: item.valorReducao ?? null,
    durationIncrease: item.prazoAcrescimoDias ?? null,
    durationDecrease: item.prazoReducaoDias ?? null,
    type: item.tipoAlteracao ?? null,
    typeName: item.tipoAlteracaoNome ?? null,
    justification: item.justificativa ?? null,
    files: (item.arquivos ?? []).map(normalizeFile),
  };
}

/**
 * Normalizes a contract detail response
 */
export function normalizeContractDetail(
  raw: PncpContractDetailResponse,
  files?: PncpContractFile[]
): NormalizedContractDetail {
  const value = raw.valorGlobal || raw.valorAcumulado || raw.valorInicial || 0;

  return {
    externalId: raw.numeroControlePNCP,
    number: raw.numeroContratoEmpenho,
    object: raw.objetoContrato || "",
    value,
    signatureDate: parseDate(raw.dataAssinatura),
    startDate: parseDate(raw.dataVigenciaInicio),
    endDate: parseDate(raw.dataVigenciaFim),
    publicationDate: parseDate(raw.dataPublicacaoPncp),
    modalidade: raw.tipoContrato || null,
    category: raw.categoriaProcesso || null,
    process: raw.processo || null,
    agency: {
      code: raw.unidadeOrgao.codigoUnidade || raw.orgaoEntidade.cnpj,
      name: raw.unidadeOrgao.nomeUnidade || raw.orgaoEntidade.razaoSocial,
      cnpj: normalizeCnpj(raw.orgaoEntidade.cnpj),
    },
    supplier: {
      cnpj: normalizeCnpj(raw.niFornecedor || ""),
      name: raw.nomeRazaoSocialFornecedor || "",
      type: raw.tipoPessoaFornecedor ?? null,
    },
    files: [
      ...(raw.arquivos ?? []).map(normalizeFile),
      ...(files ?? []).map(normalizeFile),
    ],
    amendments: (raw.historico ?? []).map(normalizeAmendment),
  };
}

/**
 * Calculates total value change from amendments
 */
export function calculateAmendmentValueChange(
  amendments: NormalizedAmendment[]
): number {
  return amendments.reduce((total, amendment) => {
    const increase = amendment.valueIncrease ?? 0;
    const decrease = amendment.valueDecrease ?? 0;
    return total + increase - decrease;
  }, 0);
}

/**
 * Calculates total duration change from amendments (in days)
 */
export function calculateAmendmentDurationChange(
  amendments: NormalizedAmendment[]
): number {
  return amendments.reduce((total, amendment) => {
    const increase = amendment.durationIncrease ?? 0;
    const decrease = amendment.durationDecrease ?? 0;
    return total + increase - decrease;
  }, 0);
}
