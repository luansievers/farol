/**
 * Structured prompts for contract summary generation
 */

import type {
  Amendment,
  Contract,
  Agency,
  Supplier,
} from "@/generated/prisma/client.js";

export interface PromptContext {
  contract: Contract & {
    agency: Agency;
    supplier: Supplier;
    amendments: Amendment[];
  };
  extractedText: string;
  comparison?:
    | {
        categoryAverage: number;
        percentile: number;
        similarCount: number;
      }
    | undefined;
}

/**
 * System prompt for the AI model
 */
export const SYSTEM_PROMPT = `You are a contract analysis expert specializing in Brazilian public contracts. Your task is to generate clear, concise summaries of government contracts in Portuguese (Brazil).

IMPORTANT GUIDELINES:
- Write in simple, accessible language that any citizen can understand
- Be factual and objective - do not add opinions or speculations
- Format monetary values in Brazilian Real (R$) with proper formatting
- Format dates in DD/MM/YYYY format
- If information is not available in the contract, indicate "Não especificado"
- Focus on the most important aspects for public transparency

OUTPUT FORMAT:
You must respond with a valid JSON object following this exact structure:
{
  "objectSimplified": "Clear description of what is being contracted in simple terms",
  "mainConditions": ["Array of key contract conditions, up to 5 items"],
  "amendments": [
    {
      "number": 1,
      "type": "Type of amendment",
      "description": "Brief description",
      "valueChange": "R$ X.XXX,XX (if applicable)",
      "durationChange": "X months (if applicable)"
    }
  ]
}

Notes:
- objectSimplified: Explain what is being contracted as if explaining to someone unfamiliar with technical/legal terms
- mainConditions: Extract the most important conditions like payment terms, guarantees, penalties, deliverables
- amendments: Only include if there are amendments, otherwise set to null`;

/**
 * Build the user prompt with contract context
 */
export function buildUserPrompt(context: PromptContext): string {
  const { contract, extractedText, comparison } = context;

  // Format value
  const value = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(contract.value));

  // Format dates
  const formatDate = (date: Date | null): string => {
    if (!date) return "Não especificado";
    return new Intl.DateTimeFormat("pt-BR").format(date);
  };

  // Build amendments section
  let amendmentsSection = "";
  if (contract.amendments.length > 0) {
    const amendmentsList = contract.amendments
      .map((a) => {
        const parts = [`Aditivo ${String(a.number)}: ${a.type}`];
        if (a.description) parts.push(`Descrição: ${a.description}`);
        if (a.valueChange) {
          const change = new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(Number(a.valueChange));
          parts.push(`Alteração de valor: ${change}`);
        }
        if (a.durationChange) {
          parts.push(`Alteração de prazo: ${String(a.durationChange)} dias`);
        }
        return parts.join("\n  ");
      })
      .join("\n\n");

    amendmentsSection = `
ADITIVOS DO CONTRATO:
${amendmentsList}`;
  }

  // Build comparison section
  let comparisonSection = "";
  if (comparison) {
    const avgValue = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(comparison.categoryAverage);

    comparisonSection = `
CONTEXTO COMPARATIVO:
- Categoria: ${contract.category}
- Valor médio de contratos similares: ${avgValue}
- Posição do contrato: Percentil ${String(comparison.percentile)}%
- Contratos similares analisados: ${String(comparison.similarCount)}`;
  }

  return `Analise o seguinte contrato público e gere um resumo estruturado:

DADOS DO CONTRATO:
- Número: ${contract.number}
- Objeto: ${contract.object}
- Valor: ${value}
- Modalidade: ${contract.modalidade ?? "Não especificada"}

PARTES:
- Órgão: ${contract.agency.name}${contract.agency.acronym ? ` (${contract.agency.acronym})` : ""}
- Fornecedor: ${contract.supplier.tradeName} (${contract.supplier.legalName})
- CNPJ: ${contract.supplier.cnpj}

DATAS:
- Assinatura: ${formatDate(contract.signatureDate)}
- Início: ${formatDate(contract.startDate)}
- Término: ${formatDate(contract.endDate)}
${amendmentsSection}${comparisonSection}

TEXTO EXTRAÍDO DO CONTRATO:
${extractedText}

Por favor, analise o contrato acima e forneça o resumo em formato JSON conforme especificado.`;
}

/**
 * Parse AI response to extract structured summary
 */
interface ParsedAmendment {
  number: number;
  type: string;
  description: string;
  valueChange: string | null;
  durationChange: string | null;
}

interface ParsedAIResponse {
  objectSimplified: string;
  mainConditions: string[];
  amendments: ParsedAmendment[] | null;
}

export function parseAIResponse(response: string): ParsedAIResponse | null {
  try {
    // Try to extract JSON from response (handle potential markdown code blocks)
    let jsonStr = response;

    // Remove markdown code blocks if present
    const jsonMatch = /```(?:json)?\s*([\s\S]*?)```/.exec(response);
    if (jsonMatch?.[1]) {
      jsonStr = jsonMatch[1];
    }

    // Try to find JSON object
    const objectMatch = /\{[\s\S]*\}/.exec(jsonStr);
    if (objectMatch?.[0]) {
      jsonStr = objectMatch[0];
    }

    const parsed: unknown = JSON.parse(jsonStr);

    // Validate structure
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "objectSimplified" in parsed &&
      "mainConditions" in parsed
    ) {
      const obj = parsed as Record<string, unknown>;

      if (
        typeof obj.objectSimplified !== "string" ||
        !Array.isArray(obj.mainConditions)
      ) {
        return null;
      }

      return {
        objectSimplified: obj.objectSimplified,
        mainConditions: obj.mainConditions.filter(
          (c): c is string => typeof c === "string"
        ),
        amendments: Array.isArray(obj.amendments)
          ? (obj.amendments as ParsedAmendment[])
          : null,
      };
    }

    return null;
  } catch {
    return null;
  }
}
