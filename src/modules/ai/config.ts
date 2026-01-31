/**
 * AI Module Configuration from Environment Variables
 */

import type { AIConfig, AIProvider, AIModel } from "./types/index.js";

function getProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER?.toLowerCase();
  if (
    provider === "openai" ||
    provider === "anthropic" ||
    provider === "ollama"
  ) {
    return provider;
  }
  return "openai";
}

function getModel(): AIModel {
  const model = process.env.AI_MODEL;
  if (model) {
    return model;
  }

  // Default models per provider
  const provider = getProvider();
  switch (provider) {
    case "openai":
      return "gpt-4o-mini";
    case "anthropic":
      return "claude-3-5-haiku-latest";
    case "ollama":
      return "llama3.2";
    default:
      return "gpt-4o-mini";
  }
}

function getApiKey(): string | undefined {
  const provider = getProvider();
  switch (provider) {
    case "openai":
      return process.env.OPENAI_API_KEY;
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY;
    case "ollama":
      return undefined; // No API key needed for local models
    default:
      return undefined;
  }
}

export function getAIConfig(): Partial<AIConfig> {
  const config: Partial<AIConfig> = {
    provider: getProvider(),
    model: getModel(),
    maxTokens: parseInt(process.env.AI_MAX_TOKENS ?? "2048", 10),
    temperature: parseFloat(process.env.AI_TEMPERATURE ?? "0.7"),
    retryAttempts: parseInt(process.env.AI_RETRY_ATTEMPTS ?? "3", 10),
    retryDelayMs: parseInt(process.env.AI_RETRY_DELAY_MS ?? "1000", 10),
    timeoutMs: parseInt(process.env.AI_TIMEOUT_MS ?? "60000", 10),
  };

  const apiKey = getApiKey();
  if (apiKey) {
    config.apiKey = apiKey;
  }

  const baseUrl = process.env.AI_BASE_URL;
  if (baseUrl) {
    config.baseUrl = baseUrl;
  }

  return config;
}

/**
 * Validate that required configuration is present
 */
export function validateAIConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const provider = getProvider();

  if (provider === "openai" && !process.env.OPENAI_API_KEY) {
    errors.push("OPENAI_API_KEY is required for OpenAI provider");
  }

  if (provider === "anthropic" && !process.env.ANTHROPIC_API_KEY) {
    errors.push("ANTHROPIC_API_KEY is required for Anthropic provider");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
