/**
 * Anthropic Provider Implementation
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  type AIProviderInterface,
  type CompletionRequest,
  type CompletionResponse,
  type ProviderConfig,
  AIServiceError,
  calculateCost,
} from "../types/index.js";

export function createAnthropicProvider(
  config: ProviderConfig
): AIProviderInterface {
  if (!config.apiKey) {
    throw new AIServiceError({
      code: "INVALID_CONFIG",
      message: "Anthropic API key is required",
      provider: "anthropic",
      retryable: false,
    });
  }

  const client = new Anthropic({
    apiKey: config.apiKey,
    timeout: config.timeoutMs,
  });

  return {
    provider: "anthropic",
    model: config.model,

    async complete(request: CompletionRequest): Promise<CompletionResponse> {
      const startTime = Date.now();

      try {
        const response = await client.messages.create({
          model: config.model,
          max_tokens: request.maxTokens ?? config.maxTokens,
          ...(request.systemPrompt && { system: request.systemPrompt }),
          messages: [{ role: "user", content: request.prompt }],
        });

        const latencyMs = Date.now() - startTime;
        const content =
          response.content[0]?.type === "text" ? response.content[0].text : "";
        const inputTokens = response.usage.input_tokens;
        const outputTokens = response.usage.output_tokens;

        return {
          content,
          model: response.model,
          provider: "anthropic",
          latencyMs,
          usage: {
            inputTokens,
            outputTokens,
            totalTokens: inputTokens + outputTokens,
            estimatedCost: calculateCost(
              config.model,
              inputTokens,
              outputTokens
            ),
          },
        };
      } catch (error) {
        if (error instanceof Anthropic.APIError) {
          const isRateLimit = error.status === 429;
          const isTimeout = error.status === 408;

          throw new AIServiceError({
            code: isRateLimit
              ? "RATE_LIMIT"
              : isTimeout
                ? "TIMEOUT"
                : "API_ERROR",
            message: error.message,
            provider: "anthropic",
            retryable: isRateLimit || isTimeout || (error.status ?? 0) >= 500,
            originalError: error,
          });
        }

        throw new AIServiceError({
          code: "NETWORK_ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
          provider: "anthropic",
          retryable: true,
          originalError: error,
        });
      }
    },
  };
}
