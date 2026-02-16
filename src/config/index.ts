/**
 * Configuration Loader
 * 
 * Loads provider configuration from plugin config and environment variables.
 */

import type { ProvidersConfig, ProviderConfig, LLMProvider } from "../types.js";

export interface ApiKeysConfig {
  openrouter?: { apiKey?: string };
  openai?: { apiKey?: string };
  anthropic?: { apiKey?: string };
  google?: { apiKey?: string };
  xai?: { apiKey?: string };
  deepseek?: { apiKey?: string };
  moonshot?: { apiKey?: string };
  opencode?: { apiKey?: string };
  azure?: { apiKey?: string; endpoint?: string };
  anyscale?: { apiKey?: string };
  together?: { apiKey?: string };
  fireworks?: { apiKey?: string };
  mistral?: { apiKey?: string };
  cohere?: { apiKey?: string };
  perplexity?: { apiKey?: string };
  [key: string]: unknown;
}

/**
 * Load provider configuration from plugin config
 */
export function loadProviderConfig(pluginConfig?: Record<string, unknown>): { providers: ProvidersConfig; routing?: Record<string, unknown> } {
  const defaultConfig: ProvidersConfig = {
    openrouter: { enabled: false },
    openai: { enabled: false },
    anthropic: { enabled: false },
    google: { enabled: false },
    xai: { enabled: false },
    deepseek: { enabled: false },
    moonshot: { enabled: false },
    opencode: { enabled: false },
    azure: { enabled: false },
    anyscale: { enabled: false },
    together: { enabled: false },
    fireworks: { enabled: false },
    mistral: { enabled: false },
    cohere: { enabled: false },
    perplexity: { enabled: false },
  };

  let config: ProvidersConfig = { ...defaultConfig };

  // Override with plugin config
  if (pluginConfig?.providers) {
    const providers = pluginConfig.providers as Record<string, ProviderConfig>;
    for (const [provider, cfg] of Object.entries(providers)) {
      if (isValidProvider(provider)) {
        config[provider] = { ...defaultConfig[provider], ...cfg };
      }
    }
  }

  // Override with environment variables
  config = applyEnvOverrides(config);

  return { providers: config, routing: pluginConfig?.routing as Record<string, unknown> | undefined };
}

/**
 * Apply environment variable overrides
 */
function applyEnvOverrides(config: ProvidersConfig): ProvidersConfig {
  // OpenRouter
  if (process.env.OPENROUTER_API_KEY) {
    config.openrouter = { ...config.openrouter, enabled: true, apiKey: process.env.OPENROUTER_API_KEY };
  }

  // OpenAI
  if (process.env.OPENAI_API_KEY) {
    config.openai = { ...config.openai, enabled: true, apiKey: process.env.OPENAI_API_KEY };
  }

  // Anthropic
  if (process.env.ANTHROPIC_API_KEY) {
    config.anthropic = { ...config.anthropic, enabled: true, apiKey: process.env.ANTHROPIC_API_KEY };
  }

  // Google
  if (process.env.GOOGLE_API_KEY) {
    config.google = { ...config.google, enabled: true, apiKey: process.env.GOOGLE_API_KEY };
  }

  // xAI
  if (process.env.XAI_API_KEY) {
    config.xai = { ...config.xai, enabled: true, apiKey: process.env.XAI_API_KEY };
  }

  // DeepSeek
  if (process.env.DEEPSEEK_API_KEY) {
    config.deepseek = { ...config.deepseek, enabled: true, apiKey: process.env.DEEPSEEK_API_KEY };
  }

  // Moonshot
  if (process.env.MOONSHOT_API_KEY) {
    config.moonshot = { ...config.moonshot, enabled: true, apiKey: process.env.MOONSHOT_API_KEY };
  }

  // OpenCode
  if (process.env.OPENCODE_API_KEY) {
    config.opencode = { ...config.opencode, enabled: true, apiKey: process.env.OPENCODE_API_KEY };
  }

  // Azure
  if (process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT) {
    config.azure = { 
      ...config.azure, 
      enabled: true, 
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      baseUrl: process.env.AZURE_OPENAI_ENDPOINT 
    };
  }

  // Anyscale
  if (process.env.ANYSCALE_API_KEY) {
    config.anyscale = { ...config.anyscale, enabled: true, apiKey: process.env.ANYSCALE_API_KEY };
  }

  // Together
  if (process.env.TOGETHER_API_KEY) {
    config.together = { ...config.together, enabled: true, apiKey: process.env.TOGETHER_API_KEY };
  }

  // Fireworks
  if (process.env.FIREWORKS_API_KEY) {
    config.fireworks = { ...config.fireworks, enabled: true, apiKey: process.env.FIREWORKS_API_KEY };
  }

  // Mistral
  if (process.env.MISTRAL_API_KEY) {
    config.mistral = { ...config.mistral, enabled: true, apiKey: process.env.MISTRAL_API_KEY };
  }

  // Cohere
  if (process.env.COHERE_API_KEY) {
    config.cohere = { ...config.cohere, enabled: true, apiKey: process.env.COHERE_API_KEY };
  }

  // Perplexity
  if (process.env.PERPLEXITY_API_KEY) {
    config.perplexity = { ...config.perplexity, enabled: true, apiKey: process.env.PERPLEXITY_API_KEY };
  }

  return config;
}

/**
 * Check if provider is valid
 */
function isValidProvider(provider: string): provider is LLMProvider {
  const validProviders: LLMProvider[] = [
    'openrouter', 'openai', 'anthropic', 'google', 'xai', 
    'deepseek', 'moonshot', 'opencode', 'azure', 'anyscale',
    'together', 'fireworks', 'mistral', 'cohere', 'perplexity'
  ];
  return validProviders.includes(provider as LLMProvider);
}

/**
 * Load API keys from environment (for runtime)
 */
export function loadApiKeysFromEnv(): ApiKeysConfig {
  return {
    openrouter: { apiKey: process.env.OPENROUTER_API_KEY },
    openai: { apiKey: process.env.OPENAI_API_KEY },
    anthropic: { apiKey: process.env.ANTHROPIC_API_KEY },
    google: { apiKey: process.env.GOOGLE_API_KEY },
    xai: { apiKey: process.env.XAI_API_KEY },
    deepseek: { apiKey: process.env.DEEPSEEK_API_KEY },
    moonshot: { apiKey: process.env.MOONSHOT_API_KEY },
    opencode: { apiKey: process.env.OPENCODE_API_KEY },
    azure: { apiKey: process.env.AZURE_OPENAI_API_KEY, endpoint: process.env.AZURE_OPENAI_ENDPOINT },
    anyscale: { apiKey: process.env.ANYSCALE_API_KEY },
    together: { apiKey: process.env.TOGETHER_API_KEY },
    fireworks: { apiKey: process.env.FIREWORKS_API_KEY },
    mistral: { apiKey: process.env.MISTRAL_API_KEY },
    cohere: { apiKey: process.env.COHERE_API_KEY },
    perplexity: { apiKey: process.env.PERPLEXITY_API_KEY },
  };
}

/**
 * Get environment variable usage instructions
 */
export function getEnvInstructions(): string {
  return `
Environment Variables (LLM Providers):
  OPENROUTER_API_KEY    - OpenRouter (all models)
  OPENAI_API_KEY        - OpenAI (GPT-4o, GPT-5, o-series)
  ANTHROPIC_API_KEY     - Anthropic (Claude)
  GOOGLE_API_KEY        - Google (Gemini)
  XAI_API_KEY           - xAI (Grok)
  DEEPSEEK_API_KEY      - DeepSeek
  MOONSHOT_API_KEY      - Moonshot (Kimi)
  OPENCODE_API_KEY      - OpenCode models
  AZURE_OPENAI_API_KEY  - Azure OpenAI
  ANYSCALE_API_KEY      - Anyscale
  TOGETHER_API_KEY      - Together AI
  FIREWORKS_API_KEY     - Fireworks AI
  MISTRAL_API_KEY       - Mistral
  COHERE_API_KEY        - Cohere
  PERPLEXITY_API_KEY    - Perplexity
`.trim();
}
