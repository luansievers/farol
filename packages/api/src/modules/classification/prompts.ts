/**
 * AI prompts for contract classification
 */

import type { ContractCategory } from "@/generated/prisma/client.js";

/**
 * System prompt for contract classification
 */
export const CLASSIFICATION_SYSTEM_PROMPT = `You are a Brazilian public contract classification expert. Your task is to classify government contracts into one of the following categories based on their object description and extracted text.

CATEGORIES:
1. OBRAS - Construction, infrastructure, civil engineering works, renovations, building projects
2. TI - Information Technology, software, hardware, IT services, digital systems
3. SAUDE - Healthcare, medical equipment, medicines, hospital services, health supplies
4. EDUCACAO - Education, training, courses, educational materials, school services
5. SERVICOS - General services like cleaning, security, consulting, maintenance (non-construction)
6. OUTROS - Only when the contract truly doesn't fit any of the above categories

CLASSIFICATION RULES:
- Analyze the contract object description first, then use extracted text for context
- Choose the most specific category that fits
- SERVICOS is for general services; use more specific categories when applicable
- Construction-related services (not just maintenance) should be OBRAS
- IT-related services and equipment should be TI
- Healthcare-related services and supplies should be SAUDE
- Education and training services should be EDUCACAO
- Only use OUTROS if the contract genuinely doesn't fit any category

OUTPUT FORMAT:
Respond with a valid JSON object:
{
  "category": "CATEGORY_NAME",
  "confidence": "high" | "medium" | "low",
  "reason": "Brief explanation in Portuguese (1-2 sentences)"
}

IMPORTANT:
- "confidence" should be "high" if the classification is clear, "medium" if there's some ambiguity, "low" if uncertain
- "reason" should explain why this category was chosen, mentioning key terms that led to the decision`;

/**
 * Build user prompt for classification
 */
export function buildClassificationPrompt(params: {
  objectDescription: string;
  extractedText?: string | null;
  value?: string;
  agencyName?: string;
}): string {
  const { objectDescription, extractedText, value, agencyName } = params;

  let prompt = `Classifique o seguinte contrato público:

OBJETO DO CONTRATO:
${objectDescription}`;

  if (value) {
    prompt += `\n\nVALOR: ${value}`;
  }

  if (agencyName) {
    prompt += `\n\nÓRGÃO: ${agencyName}`;
  }

  if (extractedText && extractedText.length > 0) {
    // Truncate if too long
    const maxLength = 3000;
    const truncatedText =
      extractedText.length > maxLength
        ? extractedText.slice(0, maxLength) + "\n[... texto truncado ...]"
        : extractedText;

    prompt += `\n\nTRECHO DO TEXTO DO CONTRATO:
${truncatedText}`;
  }

  prompt += `\n\nResponda com o JSON de classificação.`;

  return prompt;
}

/**
 * Parse AI classification response
 */
export interface ParsedClassification {
  category: ContractCategory;
  confidence: "high" | "medium" | "low";
  reason: string;
}

export function parseClassificationResponse(
  response: string
): ParsedClassification | null {
  try {
    // Try to extract JSON from response
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
      "category" in parsed &&
      "confidence" in parsed &&
      "reason" in parsed
    ) {
      const obj = parsed as Record<string, unknown>;

      const validCategories: ContractCategory[] = [
        "OBRAS",
        "TI",
        "SAUDE",
        "EDUCACAO",
        "SERVICOS",
        "OUTROS",
      ];
      const validConfidence = ["high", "medium", "low"];

      if (
        typeof obj.category === "string" &&
        validCategories.includes(obj.category as ContractCategory) &&
        typeof obj.confidence === "string" &&
        validConfidence.includes(obj.confidence) &&
        typeof obj.reason === "string"
      ) {
        return {
          category: obj.category as ContractCategory,
          confidence: obj.confidence as "high" | "medium" | "low",
          reason: obj.reason,
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}
