/**
 * AI Service - Unified interface for AI completions
 */

import type { Result } from "@shared/types/index.js";
import {
  type AIConfig,
  type AIError,
  type AIProvider,
  type AIProviderInterface,
  type AIServiceStats,
  type CompletionRequest,
  type CompletionResponse,
  AIServiceError,
} from "./types/index.js";
import {
  createOpenAIProvider,
  createAnthropicProvider,
  createOllamaProvider,
} from "./providers/index.js";

const DEFAULT_CONFIG: AIConfig = {
  provider: "openai",
  model: "gpt-4o-mini",
  maxTokens: 2048,
  temperature: 0.7,
  retryAttempts: 3,
  retryDelayMs: 1000,
  timeoutMs: 60000,
};

function createProvider(config: AIConfig): AIProviderInterface {
  const baseConfig = {
    model: config.model,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
    timeoutMs: config.timeoutMs,
  };

  switch (config.provider) {
    case "openai":
      return createOpenAIProvider({
        ...baseConfig,
        ...(config.apiKey && { apiKey: config.apiKey }),
        ...(config.baseUrl && { baseUrl: config.baseUrl }),
      });
    case "anthropic":
      return createAnthropicProvider({
        ...baseConfig,
        ...(config.apiKey && { apiKey: config.apiKey }),
        ...(config.baseUrl && { baseUrl: config.baseUrl }),
      });
    case "ollama":
      return createOllamaProvider({
        ...baseConfig,
        ...(config.baseUrl && { baseUrl: config.baseUrl }),
      });
    default:
      throw new AIServiceError({
        code: "INVALID_CONFIG",
        message: `Unknown provider: ${config.provider as string}`,
        retryable: false,
      });
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatStats(stats: AIServiceStats): string {
  return [
    `Requests: ${String(stats.successfulRequests)}/${String(stats.totalRequests)} successful`,
    `Tokens: ${String(stats.totalInputTokens)} in / ${String(stats.totalOutputTokens)} out`,
    `Cost: $${stats.totalCost.toFixed(4)}`,
    `Avg latency: ${stats.averageLatencyMs.toFixed(0)}ms`,
  ].join(" | ");
}

export function createAIService(partialConfig: Partial<AIConfig> = {}) {
  const config: AIConfig = { ...DEFAULT_CONFIG, ...partialConfig };
  const provider = createProvider(config);

  // Stats tracking
  const stats: AIServiceStats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0,
    averageLatencyMs: 0,
  };

  let totalLatencyMs = 0;

  function updateStats(response: CompletionResponse): void {
    stats.successfulRequests++;
    stats.totalInputTokens += response.usage.inputTokens;
    stats.totalOutputTokens += response.usage.outputTokens;
    stats.totalCost += response.usage.estimatedCost;
    totalLatencyMs += response.latencyMs;
    stats.averageLatencyMs = totalLatencyMs / stats.successfulRequests;
  }

  function logUsage(response: CompletionResponse): void {
    console.log(
      `[AI] ${response.provider}/${response.model} | ` +
        `${String(response.usage.inputTokens)}→${String(response.usage.outputTokens)} tokens | ` +
        `$${response.usage.estimatedCost.toFixed(4)} | ` +
        `${String(response.latencyMs)}ms`
    );
  }

  async function completeWithRetry(
    request: CompletionRequest
  ): Promise<Result<CompletionResponse, AIError>> {
    stats.totalRequests++;
    let lastError: AIServiceError | null = null;

    for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
      try {
        const response = await provider.complete(request);
        updateStats(response);
        logUsage(response);
        return { success: true, data: response };
      } catch (error) {
        lastError = error as AIServiceError;

        if (!lastError.retryable || attempt === config.retryAttempts) {
          break;
        }

        // Exponential backoff
        const delay = config.retryDelayMs * Math.pow(2, attempt - 1);
        console.log(
          `[AI] Retry ${String(attempt)}/${String(config.retryAttempts)} after ${String(delay)}ms: ${lastError.message}`
        );
        await sleep(delay);
      }
    }

    stats.failedRequests++;
    return {
      success: false,
      error: lastError?.toJSON() ?? {
        code: "API_ERROR",
        message: "Unknown error",
        retryable: false,
      },
    };
  }

  return {
    /**
     * Get current provider info
     */
    getProvider(): { provider: AIProvider; model: string } {
      return {
        provider: provider.provider,
        model: provider.model,
      };
    },

    /**
     * Send a completion request with automatic retry
     */
    async complete(
      request: CompletionRequest
    ): Promise<Result<CompletionResponse, AIError>> {
      return completeWithRetry(request);
    },

    /**
     * Simple prompt completion (convenience method)
     */
    async prompt(
      prompt: string,
      systemPrompt?: string
    ): Promise<Result<string, AIError>> {
      const request: CompletionRequest = { prompt };
      if (systemPrompt) {
        request.systemPrompt = systemPrompt;
      }
      const result = await completeWithRetry(request);
      if (!result.success) {
        return result;
      }
      return { success: true, data: result.data.content };
    },

    /**
     * Get current usage statistics
     */
    getStats(): AIServiceStats {
      return { ...stats };
    },

    /**
     * Log current stats summary
     */
    logStats(): void {
      console.log(`[AI Stats] ${formatStats(stats)}`);
    },

    /**
     * Reset statistics
     */
    resetStats(): void {
      stats.totalRequests = 0;
      stats.successfulRequests = 0;
      stats.failedRequests = 0;
      stats.totalInputTokens = 0;
      stats.totalOutputTokens = 0;
      stats.totalCost = 0;
      stats.averageLatencyMs = 0;
      totalLatencyMs = 0;
    },
  };
}

export type AIService = ReturnType<typeof createAIService>;
