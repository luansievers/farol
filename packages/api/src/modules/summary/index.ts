/**
 * Summary Module
 * AI-powered contract summary generation
 *
 * @example
 * ```ts
 * import { createSummaryService } from "@modules/summary";
 *
 * const summary = createSummaryService();
 *
 * // Generate summary for a specific contract
 * const result = await summary.generateSummary(contractId);
 *
 * // Process all pending contracts
 * await summary.processAll();
 *
 * // Regenerate an existing summary
 * await summary.regenerateSummary(contractId);
 * ```
 */

export type {
  SummaryConfig,
  SummaryError,
  SummaryErrorCode,
  SummaryStats,
  SummaryDatabaseStats,
  ContractSummary,
  AmendmentSummary,
  ComparisonContext,
} from "./types/index.js";

export { createSummaryService, type SummaryService } from "./service.js";

export { SYSTEM_PROMPT, buildUserPrompt, parseAIResponse } from "./prompts.js";
