/**
 * Ollama Provider Implementation (Placeholder for local models)
 *
 * Ollama provides local LLM inference. This is a placeholder implementation
 * that can be extended when local model support is needed.
 *
 * @see https://ollama.ai/
 */

import {
  type AIProviderInterface,
  type CompletionRequest,
  type CompletionResponse,
  type ProviderConfig,
  AIServiceError,
} from "../types/index.js";

interface OllamaGenerateResponse {
  model: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export function createOllamaProvider(
  config: ProviderConfig
): AIProviderInterface {
  const baseUrl = config.baseUrl ?? "http://localhost:11434";

  return {
    provider: "ollama",
    model: config.model,

    async complete(request: CompletionRequest): Promise<CompletionResponse> {
      const startTime = Date.now();

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, config.timeoutMs);

        const prompt = request.systemPrompt
          ? `${request.systemPrompt}\n\n${request.prompt}`
          : request.prompt;

        const response = await fetch(`${baseUrl}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: config.model,
            prompt,
            stream: false,
            options: {
              num_predict: request.maxTokens ?? config.maxTokens,
              temperature: request.temperature ?? config.temperature,
            },
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new AIServiceError({
            code: "API_ERROR",
            message: `Ollama API error: ${String(response.status)} - ${errorText}`,
            provider: "ollama",
            retryable: response.status >= 500,
          });
        }

        const data = (await response.json()) as OllamaGenerateResponse;
        const latencyMs = Date.now() - startTime;

        // Ollama provides token counts in the response
        const inputTokens = data.prompt_eval_count ?? 0;
        const outputTokens = data.eval_count ?? 0;

        return {
          content: data.response,
          model: data.model,
          provider: "ollama",
          latencyMs,
          usage: {
            inputTokens,
            outputTokens,
            totalTokens: inputTokens + outputTokens,
            estimatedCost: 0, // Local models are free
          },
        };
      } catch (error) {
        if (error instanceof AIServiceError) {
          throw error;
        }

        const isAbort = error instanceof Error && error.name === "AbortError";
        const isConnectionRefused =
          error instanceof Error && error.message.includes("ECONNREFUSED");

        throw new AIServiceError({
          code: isAbort
            ? "TIMEOUT"
            : isConnectionRefused
              ? "PROVIDER_NOT_AVAILABLE"
              : "NETWORK_ERROR",
          message: isConnectionRefused
            ? `Ollama is not running at ${baseUrl}. Start it with 'ollama serve'`
            : error instanceof Error
              ? error.message
              : "Unknown error",
          provider: "ollama",
          retryable: !isConnectionRefused,
          originalError: error,
        });
      }
    },
  };
}
