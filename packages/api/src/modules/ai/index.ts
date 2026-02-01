/**
 * AI Module - Configurable AI provider abstraction
 *
 * Supports multiple providers:
 * - OpenAI (GPT-4o, GPT-4o-mini)
 * - Anthropic (Claude)
 * - Ollama (local models)
 *
 * @example
 * ```ts
 * import { createAIService, getAIConfig } from "@modules/ai";
 *
 * const ai = createAIService(getAIConfig());
 *
 * const result = await ai.prompt("Summarize this contract...");
 * if (result.success) {
 *   console.log(result.data);
 * }
 *
 * ai.logStats(); // Show usage statistics
 * ```
 */

// Service
export { createAIService, type AIService } from "./service.js";

// Configuration
export { getAIConfig, validateAIConfig } from "./config.js";

// Providers (for advanced usage)
export {
  createOpenAIProvider,
  createAnthropicProvider,
  createOllamaProvider,
} from "./providers/index.js";

// Types
export type {
  AIConfig,
  AIProvider,
  AIModel,
  OpenAIModel,
  AnthropicModel,
  OllamaModel,
  ProviderConfig,
  CompletionRequest,
  CompletionResponse,
  TokenUsage,
  AIProviderInterface,
  AIError,
  AIErrorCode,
  AIServiceStats,
} from "./types/index.js";

export { PRICING, calculateCost, AIServiceError } from "./types/index.js";
