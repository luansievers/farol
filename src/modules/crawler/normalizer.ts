/**
 * Normalizes PNCP API responses to internal format
 */

import type {
  NormalizedContract,
  PncpContractResponse,
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
 * Builds PNCP contract link
 */
function buildContractLink(contract: PncpContractResponse): string | null {
  if (contract.linkContrato) {
    return contract.linkContrato;
  }

  // Build link from control number if available
  if (contract.numeroControlePNCP) {
    return `https://pncp.gov.br/app/contrato/${contract.numeroControlePNCP}`;
  }

  return null;
}

/**
 * Normalizes a single contract from PNCP format to internal format
 */
export function normalizeContract(
  raw: PncpContractResponse
): NormalizedContract {
  // Use the most representative value - valorGlobal is the primary field
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
    agency: {
      code: raw.unidadeOrgao.codigoUnidade || raw.orgaoEntidade.cnpj,
      name: raw.unidadeOrgao.nomeUnidade || raw.orgaoEntidade.razaoSocial,
      cnpj: normalizeCnpj(raw.orgaoEntidade.cnpj),
    },
    supplier: {
      cnpj: normalizeCnpj(raw.niFornecedor || ""),
      name: raw.nomeRazaoSocialFornecedor || "",
    },
    pdfUrl: buildContractLink(raw),
    rawData: raw,
  };
}

/**
 * Normalizes an array of contracts
 */
export function normalizeContracts(
  raw: PncpContractResponse[]
): NormalizedContract[] {
  return raw.map(normalizeContract);
}
