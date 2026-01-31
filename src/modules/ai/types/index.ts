/**
 * AI Module Type Definitions
 */

// Provider types
export type AIProvider = "openai" | "anthropic" | "ollama";

// Model types (string to allow any model name for flexibility)
export type AIModel = string;

// Known model names for documentation purposes
export type OpenAIModel = "gpt-4o" | "gpt-4o-mini";
export type AnthropicModel =
  | "claude-3-5-sonnet-latest"
  | "claude-3-5-haiku-latest";
export type OllamaModel = "llama3.2" | "mistral";

// Configuration
export interface AIConfig {
  provider: AIProvider;
  model: AIModel;
  apiKey?: string;
  baseUrl?: string;
  maxTokens: number;
  temperature: number;
  retryAttempts: number;
  retryDelayMs: number;
  timeoutMs: number;
}

export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model: AIModel;
  maxTokens: number;
  temperature: number;
  timeoutMs: number;
}

// Completion types
export interface CompletionRequest {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface CompletionResponse {
  content: string;
  usage: TokenUsage;
  model: string;
  provider: AIProvider;
  latencyMs: number;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

// Provider interface
export interface AIProviderInterface {
  readonly provider: AIProvider;
  readonly model: AIModel;
  complete(request: CompletionRequest): Promise<CompletionResponse>;
}

// Error handling
export type AIErrorCode =
  | "INVALID_CONFIG"
  | "API_ERROR"
  | "RATE_LIMIT"
  | "TIMEOUT"
  | "INVALID_RESPONSE"
  | "PROVIDER_NOT_AVAILABLE"
  | "NETWORK_ERROR";

export interface AIError {
  code: AIErrorCode;
  message: string;
  provider?: AIProvider;
  retryable: boolean;
  originalError?: unknown;
}

export class AIServiceError extends Error {
  code: AIErrorCode;
  provider?: AIProvider;
  retryable: boolean;
  originalError?: unknown;

  constructor(error: AIError) {
    super(error.message);
    this.name = "AIServiceError";
    this.code = error.code;
    if (error.provider) {
      this.provider = error.provider;
    }
    this.retryable = error.retryable;
    if (error.originalError !== undefined) {
      this.originalError = error.originalError;
    }
  }

  toJSON(): AIError {
    const result: AIError = {
      code: this.code,
      message: this.message,
      retryable: this.retryable,
    };
    if (this.provider) {
      result.provider = this.provider;
    }
    if (this.originalError !== undefined) {
      result.originalError = this.originalError;
    }
    return result;
  }
}

// Service types
export interface AIServiceStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  averageLatencyMs: number;
}

// Pricing per 1M tokens (USD)
export const PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  // Anthropic
  "claude-3-5-sonnet-latest": { input: 3, output: 15 },
  "claude-3-5-haiku-latest": { input: 0.8, output: 4 },
  // Ollama (free/local)
  default: { input: 0, output: 0 },
};

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const modelPricing = PRICING[model];
  const defaultPricing = PRICING.default;
  const pricing = modelPricing ?? defaultPricing;
  if (!pricing) {
    return 0;
  }
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}
