/**
 * OpenAI Provider Implementation
 */

import OpenAI from "openai";
import {
  type AIProviderInterface,
  type CompletionRequest,
  type CompletionResponse,
  type ProviderConfig,
  AIServiceError,
  calculateCost,
} from "../types/index.js";

export function createOpenAIProvider(
  config: ProviderConfig
): AIProviderInterface {
  if (!config.apiKey) {
    throw new AIServiceError({
      code: "INVALID_CONFIG",
      message: "OpenAI API key is required",
      provider: "openai",
      retryable: false,
    });
  }

  const client = new OpenAI({
    apiKey: config.apiKey,
    timeout: config.timeoutMs,
  });

  return {
    provider: "openai",
    model: config.model,

    async complete(request: CompletionRequest): Promise<CompletionResponse> {
      const startTime = Date.now();

      try {
        const response = await client.chat.completions.create({
          model: config.model,
          messages: [
            ...(request.systemPrompt
              ? [{ role: "system" as const, content: request.systemPrompt }]
              : []),
            { role: "user" as const, content: request.prompt },
          ],
          max_tokens: request.maxTokens ?? config.maxTokens,
          temperature: request.temperature ?? config.temperature,
        });

        const latencyMs = Date.now() - startTime;
        const content = response.choices[0]?.message.content ?? "";
        const inputTokens = response.usage?.prompt_tokens ?? 0;
        const outputTokens = response.usage?.completion_tokens ?? 0;

        return {
          content,
          model: response.model,
          provider: "openai",
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
        if (error instanceof OpenAI.APIError) {
          const isRateLimit = error.status === 429;
          const isTimeout = error.status === 408 || error.code === "ETIMEDOUT";

          throw new AIServiceError({
            code: isRateLimit
              ? "RATE_LIMIT"
              : isTimeout
                ? "TIMEOUT"
                : "API_ERROR",
            message: error.message,
            provider: "openai",
            retryable: isRateLimit || isTimeout || (error.status ?? 0) >= 500,
            originalError: error,
          });
        }

        throw new AIServiceError({
          code: "NETWORK_ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
          provider: "openai",
          retryable: true,
          originalError: error,
        });
      }
    },
  };
}
