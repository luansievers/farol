/**
 * Classification Module
 * Automatic contract classification by category
 *
 * @example
 * ```ts
 * import { createClassificationService } from "@modules/classification";
 *
 * const classification = createClassificationService();
 *
 * // Classify all pending contracts
 * await classification.processAll();
 *
 * // Classify a specific contract
 * const result = await classification.classifyAndSave(contractId);
 *
 * // Manually set category
 * await classification.setManualCategory(contractId, "TI");
 *
 * // Get statistics
 * const stats = await classification.getStats();
 * ```
 */

export type {
  ClassificationConfig,
  ClassificationError,
  ClassificationErrorCode,
  ClassificationResult,
  ClassificationSource,
  ClassificationConfidence,
  ClassificationStats,
  ClassificationDatabaseStats,
  ContractCategory,
} from "./types/index.js";

export {
  createClassificationService,
  type ClassificationService,
} from "./service.js";

export {
  getCategoryFromExpenseCode,
  getCategoryFromKeywords,
  CATEGORY_KEYWORDS,
  EXPENSE_NATURE_MAPPINGS,
} from "./mappings.js";

export {
  CLASSIFICATION_SYSTEM_PROMPT,
  buildClassificationPrompt,
  parseClassificationResponse,
} from "./prompts.js";
