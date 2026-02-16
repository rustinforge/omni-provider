/**
 * Models Configuration
 * 
 * Supported models and aliases for OmniLLM.
 */

import type { LLMProvider, ModelInfo, ModelAlias } from "./types";

/**
 * All supported models with their metadata
 */
export const MODELS: Record<string, ModelInfo> = {
  // OpenAI
  'gpt-4o': {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    contextWindow: 128000,
    maxOutputTokens: 16384,
    capabilities: { streaming: true, functionCalling: true, vision: true },
    pricing: { input: 5.0, output: 15.0 },
  },
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    contextWindow: 128000,
    maxOutputTokens: 16384,
    capabilities: { streaming: true, functionCalling: true, vision: true },
    pricing: { input: 0.15, output: 0.6 },
  },
  'gpt-5': {
    id: 'gpt-5',
    name: 'GPT-5',
    provider: 'openai',
    contextWindow: 200000,
    maxOutputTokens: 32000,
    capabilities: { streaming: true, functionCalling: true, vision: true, reasoning: true },
    pricing: { input: 10.0, output: 30.0 },
  },
  'o3': {
    id: 'o3',
    name: 'OpenAI o3',
    provider: 'openai',
    contextWindow: 200000,
    maxOutputTokens: 32000,
    capabilities: { streaming: false, functionCalling: true, reasoning: true },
    pricing: { input: 10.0, output: 40.0 },
  },
  'o3-mini': {
    id: 'o3-mini',
    name: 'OpenAI o3-mini',
    provider: 'openai',
    contextWindow: 128000,
    maxOutputTokens: 32000,
    capabilities: { streaming: false, functionCalling: true, reasoning: true },
    pricing: { input: 1.1, output: 4.4 },
  },

  // Anthropic
  'claude-sonnet-4': {
    id: 'claude-sonnet-4',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    contextWindow: 200000,
    maxOutputTokens: 32000,
    capabilities: { streaming: true, functionCalling: true, vision: true },
    pricing: { input: 3.0, output: 15.0 },
  },
  'claude-opus-4': {
    id: 'claude-opus-4',
    name: 'Claude Opus 4',
    provider: 'anthropic',
    contextWindow: 200000,
    maxOutputTokens: 32000,
    capabilities: { streaming: true, functionCalling: true, vision: true },
    pricing: { input: 15.0, output: 75.0 },
  },
  'claude-haiku-4': {
    id: 'claude-haiku-4',
    name: 'Claude Haiku 4',
    provider: 'anthropic',
    contextWindow: 200000,
    maxOutputTokens: 32000,
    capabilities: { streaming: true, functionCalling: true, vision: true },
    pricing: { input: 0.8, output: 4.0 },
  },

  // Google
  'gemini-2.5-pro': {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'google',
    contextWindow: 1000000,
    maxOutputTokens: 64000,
    capabilities: { streaming: true, functionCalling: true, vision: true, reasoning: true },
    pricing: { input: 1.25, output: 5.0 },
  },
  'gemini-2.5-flash': {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    contextWindow: 1000000,
    maxOutputTokens: 64000,
    capabilities: { streaming: true, functionCalling: true, vision: true },
    pricing: { input: 0.075, output: 0.3 },
  },

  // xAI
  'grok-4': {
    id: 'grok-4',
    name: 'Grok 4',
    provider: 'xai',
    contextWindow: 200000,
    maxOutputTokens: 32000,
    capabilities: { streaming: true, functionCalling: true, reasoning: true },
    pricing: { input: 5.0, output: 15.0 },
  },
  'grok-3-fast': {
    id: 'grok-3-fast',
    name: 'Grok 3 Fast',
    provider: 'xai',
    contextWindow: 131072,
    maxOutputTokens: 32768,
    capabilities: { streaming: true, functionCalling: true },
    pricing: { input: 3.0, output: 15.0 },
  },
  'grok-3': {
    id: 'grok-3',
    name: 'Grok 3',
    provider: 'xai',
    contextWindow: 131072,
    maxOutputTokens: 32768,
    capabilities: { streaming: true, functionCalling: true },
    pricing: { input: 5.0, output: 15.0 },
  },

  // DeepSeek
  'deepseek-v3': {
    id: 'deepseek-v3',
    name: 'DeepSeek V3',
    provider: 'deepseek',
    contextWindow: 64000,
    maxOutputTokens: 32000,
    capabilities: { streaming: true, functionCalling: true },
    pricing: { input: 0.27, output: 1.1 },
  },
  'deepseek-chat': {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    provider: 'deepseek',
    contextWindow: 64000,
    maxOutputTokens: 32000,
    capabilities: { streaming: true },
    pricing: { input: 0.14, output: 0.28 },
  },

  // Moonshot (Kimi)
  'kimi-k2.5': {
    id: 'kimi-k2.5',
    name: 'Kimi K2.5',
    provider: 'moonshot',
    contextWindow: 128000,
    maxOutputTokens: 32000,
    capabilities: { streaming: true, functionCalling: true, vision: true },
    pricing: { input: 0.6, output: 2.0 },
  },
  'kimi-k2.5-mini': {
    id: 'kimi-k2.5-mini',
    name: 'Kimi K2.5 Mini',
    provider: 'moonshot',
    contextWindow: 128000,
    maxOutputTokens: 32000,
    capabilities: { streaming: true, functionCalling: true, vision: true },
    pricing: { input: 0.2, output: 0.6 },
  },

  // OpenCode
  'big-pickle': {
    id: 'big-pickle',
    name: 'Big Pickle',
    provider: 'opencode',
    contextWindow: 200000,
    maxOutputTokens: 32000,
    capabilities: { streaming: true, functionCalling: true, reasoning: true },
    pricing: { input: 0.0, output: 0.0 }, // Free
  },
  'gpt-5-nano': {
    id: 'gpt-5-nano',
    name: 'GPT-5 Nano',
    provider: 'opencode',
    contextWindow: 128000,
    maxOutputTokens: 32000,
    capabilities: { streaming: true, functionCalling: true },
    pricing: { input: 0.0, output: 0.0 }, // Free
  },
  'kimi-k2.5-free': {
    id: 'kimi-k2.5-free',
    name: 'Kimi K2.5 Free',
    provider: 'opencode',
    contextWindow: 128000,
    maxOutputTokens: 32000,
    capabilities: { streaming: true, functionCalling: true },
    pricing: { input: 0.0, output: 0.0 }, // Free
  },
  'minimax-m2.5-free': {
    id: 'minimax-m2.5-free',
    name: 'MiniMax M2.5 Free',
    provider: 'opencode',
    contextWindow: 128000,
    maxOutputTokens: 32000,
    capabilities: { streaming: true, functionCalling: true },
    pricing: { input: 0.0, output: 0.0 }, // Free
  },

  // OpenRouter (meta-provider, routes to others)
  'openrouter/auto': {
    id: 'openrouter/auto',
    name: 'OpenRouter Auto',
    provider: 'openrouter',
    contextWindow: 128000,
    maxOutputTokens: 32000,
    capabilities: { streaming: true, functionCalling: true },
  },
  
  // NVIDIA Build (NIM endpoints)
  'z-ai/glm5': {
    id: 'z-ai/glm5',
    name: 'GLM-5',
    provider: 'nvidia',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    capabilities: { streaming: true, functionCalling: true },
    pricing: { input: 0.0, output: 0.0 }, // Free tier available
  },
  'nvidia/llama-3.1-nemotron-70b-instruct': {
    id: 'nvidia/llama-3.1-nemotron-70b-instruct',
    name: 'Nemotron 70B',
    provider: 'nvidia',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    capabilities: { streaming: true, functionCalling: true },
    pricing: { input: 0.0, output: 0.0 },
  },
  'nvidia/mistral-large': {
    id: 'nvidia/mistral-large',
    name: 'Mistral Large (NVIDIA)',
    provider: 'nvidia',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    capabilities: { streaming: true, functionCalling: true },
    pricing: { input: 0.0, output: 0.0 },
  },
};

/**
 * Model aliases for easy access
 */
export const MODEL_ALIASES: ModelAlias[] = [
  { alias: 'auto', model: 'omni-llm/auto' },
  { alias: 'sonnet', model: 'claude-sonnet-4' },
  { alias: 'opus', model: 'claude-opus-4' },
  { alias: 'haiku', model: 'claude-haiku-4' },
  { alias: 'gpt', model: 'gpt-4o' },
  { alias: 'gpt-mini', model: 'gpt-4o-mini' },
  { alias: 'flash', model: 'gemini-2.5-flash' },
  { alias: 'pro', model: 'gemini-2.5-pro' },
  { alias: 'deepseek', model: 'deepseek-v3' },
  { alias: 'grok', model: 'grok-3' },
  { alias: 'grok-reasoning', model: 'grok-3-fast' },
  { alias: 'kimi', model: 'kimi-k2.5' },
  { alias: 'big-pickle', model: 'big-pickle', provider: 'opencode' },
  { alias: 'gpt-nano', model: 'gpt-5-nano', provider: 'opencode' },
  { alias: 'reasoner', model: 'o3-mini' },
  { alias: 'reasoning', model: 'o3' },
  { alias: 'glm5', model: 'z-ai/glm5' },
  { alias: 'nemotron', model: 'nvidia/llama-3.1-nemotron-70b-instruct' },
];

/**
 * Models available in OpenClaw
 */
export const OPENCLAW_MODELS = [
  'omni-llm/auto',
  'omni-llm/sonnet',
  'omni-llm/opus',
  'omni-llm/haiku',
  'omni-llm/gpt',
  'omni-llm/gpt-mini',
  'omni-llm/flash',
  'omni-llm/pro',
  'omni-llm/deepseek',
  'omni-llm/grok',
  'omni-llm/grok-reasoning',
  'omni-llm/kimi',
  'omni-llm/big-pickle',
  'omni-llm/gpt-nano',
  'omni-llm/reasoner',
  'omni-llm/reasoning',
];

/**
 * Get model info by ID
 */
export function getModel(modelId: string): ModelInfo | undefined {
  return MODELS[modelId];
}

/**
 * Resolve model alias
 */
export function resolveModelAlias(alias: string): string {
  const found = MODEL_ALIASES.find(a => a.alias === alias);
  return found?.model || alias;
}

/**
 * Get models by provider
 */
export function getModelsByProvider(provider: LLMProvider): ModelInfo[] {
  return Object.values(MODELS).filter(m => m.provider === provider);
}

/**
 * Get free models (no API cost)
 */
export function getFreeModels(): ModelInfo[] {
  return Object.values(MODELS).filter(m => m.pricing?.input === 0);
}
