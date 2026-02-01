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
 * Builds PNCP portal contract link
 * numeroControlePNCP format: CNPJ-type-sequencial/year (e.g., "44705055000172-2-000010/2024")
 * Portal URL format: /app/contratos/{cnpj}/{year}/{sequencial}
 */
function buildContractLink(contract: PncpContractResponse): string | null {
  if (contract.linkContrato) {
    return contract.linkContrato;
  }

  // Parse numeroControlePNCP to build correct portal URL
  if (contract.numeroControlePNCP) {
    const match = /^(\d{14})-\d+-(\d+)\/(\d{4})$/.exec(
      contract.numeroControlePNCP
    );
    if (match?.[1] && match[2] && match[3]) {
      const cnpj = match[1];
      const sequencial = match[2];
      const year = match[3];
      const seq = parseInt(sequencial, 10);
      return `https://pncp.gov.br/app/contratos/${cnpj}/${year}/${seq}`;
    }
    // Fallback to old format if parsing fails
    return `https://pncp.gov.br/app/contratos/${contract.numeroControlePNCP}`;
  }

  return null;
}

/**
 * Extracts modalidade string from tipoContrato field
 * Handles both old format (string) and new format (object with id/nome)
 */
function extractModalidade(
  tipoContrato: string | { id: number; nome: string } | null | undefined
): string | null {
  if (!tipoContrato) return null;
  if (typeof tipoContrato === "string") return tipoContrato;
  if (typeof tipoContrato === "object" && "nome" in tipoContrato) {
    return tipoContrato.nome;
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
    modalidade: extractModalidade(raw.tipoContrato),
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
