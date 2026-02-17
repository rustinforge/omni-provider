// src/models.ts
var MODELS = {
  // OpenAI
  "gpt-4o": {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    contextWindow: 128e3,
    maxOutputTokens: 16384,
    capabilities: { streaming: true, functionCalling: true, vision: true },
    pricing: { input: 5, output: 15 }
  },
  "gpt-4o-mini": {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    contextWindow: 128e3,
    maxOutputTokens: 16384,
    capabilities: { streaming: true, functionCalling: true, vision: true },
    pricing: { input: 0.15, output: 0.6 }
  },
  "gpt-5": {
    id: "gpt-5",
    name: "GPT-5",
    provider: "openai",
    contextWindow: 2e5,
    maxOutputTokens: 32e3,
    capabilities: { streaming: true, functionCalling: true, vision: true, reasoning: true },
    pricing: { input: 10, output: 30 }
  },
  "o3": {
    id: "o3",
    name: "OpenAI o3",
    provider: "openai",
    contextWindow: 2e5,
    maxOutputTokens: 32e3,
    capabilities: { streaming: false, functionCalling: true, reasoning: true },
    pricing: { input: 10, output: 40 }
  },
  "o3-mini": {
    id: "o3-mini",
    name: "OpenAI o3-mini",
    provider: "openai",
    contextWindow: 128e3,
    maxOutputTokens: 32e3,
    capabilities: { streaming: false, functionCalling: true, reasoning: true },
    pricing: { input: 1.1, output: 4.4 }
  },
  // Anthropic
  "claude-sonnet-4": {
    id: "claude-sonnet-4",
    name: "Claude Sonnet 4",
    provider: "anthropic",
    contextWindow: 2e5,
    maxOutputTokens: 32e3,
    capabilities: { streaming: true, functionCalling: true, vision: true },
    pricing: { input: 3, output: 15 }
  },
  "claude-opus-4": {
    id: "claude-opus-4",
    name: "Claude Opus 4",
    provider: "anthropic",
    contextWindow: 2e5,
    maxOutputTokens: 32e3,
    capabilities: { streaming: true, functionCalling: true, vision: true },
    pricing: { input: 15, output: 75 }
  },
  "claude-haiku-4": {
    id: "claude-haiku-4",
    name: "Claude Haiku 4",
    provider: "anthropic",
    contextWindow: 2e5,
    maxOutputTokens: 32e3,
    capabilities: { streaming: true, functionCalling: true, vision: true },
    pricing: { input: 0.8, output: 4 }
  },
  // Google
  "gemini-2.5-pro": {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "google",
    contextWindow: 1e6,
    maxOutputTokens: 64e3,
    capabilities: { streaming: true, functionCalling: true, vision: true, reasoning: true },
    pricing: { input: 1.25, output: 5 }
  },
  "gemini-2.5-flash": {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "google",
    contextWindow: 1e6,
    maxOutputTokens: 64e3,
    capabilities: { streaming: true, functionCalling: true, vision: true },
    pricing: { input: 0.075, output: 0.3 }
  },
  // xAI
  "grok-4": {
    id: "grok-4",
    name: "Grok 4",
    provider: "xai",
    contextWindow: 2e5,
    maxOutputTokens: 32e3,
    capabilities: { streaming: true, functionCalling: true, reasoning: true },
    pricing: { input: 5, output: 15 }
  },
  "grok-3-fast": {
    id: "grok-3-fast",
    name: "Grok 3 Fast",
    provider: "xai",
    contextWindow: 131072,
    maxOutputTokens: 32768,
    capabilities: { streaming: true, functionCalling: true },
    pricing: { input: 3, output: 15 }
  },
  "grok-3": {
    id: "grok-3",
    name: "Grok 3",
    provider: "xai",
    contextWindow: 131072,
    maxOutputTokens: 32768,
    capabilities: { streaming: true, functionCalling: true },
    pricing: { input: 5, output: 15 }
  },
  // DeepSeek
  "deepseek-v3": {
    id: "deepseek-v3",
    name: "DeepSeek V3",
    provider: "deepseek",
    contextWindow: 64e3,
    maxOutputTokens: 32e3,
    capabilities: { streaming: true, functionCalling: true },
    pricing: { input: 0.27, output: 1.1 }
  },
  "deepseek-chat": {
    id: "deepseek-chat",
    name: "DeepSeek Chat",
    provider: "deepseek",
    contextWindow: 64e3,
    maxOutputTokens: 32e3,
    capabilities: { streaming: true },
    pricing: { input: 0.14, output: 0.28 }
  },
  // Moonshot (Kimi)
  "kimi-k2.5": {
    id: "kimi-k2.5",
    name: "Kimi K2.5",
    provider: "moonshot",
    contextWindow: 128e3,
    maxOutputTokens: 32e3,
    capabilities: { streaming: true, functionCalling: true, vision: true },
    pricing: { input: 0.6, output: 2 }
  },
  "kimi-k2.5-mini": {
    id: "kimi-k2.5-mini",
    name: "Kimi K2.5 Mini",
    provider: "moonshot",
    contextWindow: 128e3,
    maxOutputTokens: 32e3,
    capabilities: { streaming: true, functionCalling: true, vision: true },
    pricing: { input: 0.2, output: 0.6 }
  },
  // OpenCode
  "big-pickle": {
    id: "big-pickle",
    name: "Big Pickle",
    provider: "opencode",
    contextWindow: 2e5,
    maxOutputTokens: 32e3,
    capabilities: { streaming: true, functionCalling: true, reasoning: true },
    pricing: { input: 0, output: 0 }
  },
  "gpt-5-nano": {
    id: "gpt-5-nano",
    name: "GPT-5 Nano",
    provider: "opencode",
    contextWindow: 128e3,
    maxOutputTokens: 32e3,
    capabilities: { streaming: true, functionCalling: true },
    pricing: { input: 0, output: 0 }
  },
  "kimi-k2.5-free": {
    id: "kimi-k2.5-free",
    name: "Kimi K2.5 Free",
    provider: "opencode",
    contextWindow: 128e3,
    maxOutputTokens: 32e3,
    capabilities: { streaming: true, functionCalling: true },
    pricing: { input: 0, output: 0 }
  },
  "minimax-m2.5-free": {
    id: "minimax-m2.5-free",
    name: "MiniMax M2.5 Free",
    provider: "opencode",
    contextWindow: 128e3,
    maxOutputTokens: 32e3,
    capabilities: { streaming: true, functionCalling: true },
    pricing: { input: 0, output: 0 }
  },
  // OpenRouter (meta-provider)
  "openrouter/auto": {
    id: "openrouter/auto",
    name: "OpenRouter Auto",
    provider: "openrouter",
    contextWindow: 128e3,
    maxOutputTokens: 32e3,
    capabilities: { streaming: true, functionCalling: true }
  },
  // NVIDIA
  "z-ai/glm5": {
    id: "z-ai/glm5",
    name: "GLM-5",
    provider: "nvidia",
    contextWindow: 128e3,
    maxOutputTokens: 4096,
    capabilities: { streaming: true, functionCalling: true },
    pricing: { input: 0, output: 0 }
  },
  "nvidia/llama-3.1-nemotron-70b-instruct": {
    id: "nvidia/llama-3.1-nemotron-70b-instruct",
    name: "Nemotron 70B",
    provider: "nvidia",
    contextWindow: 128e3,
    maxOutputTokens: 4096,
    capabilities: { streaming: true, functionCalling: true },
    pricing: { input: 0, output: 0 }
  },
  "nvidia/mistral-large": {
    id: "nvidia/mistral-large",
    name: "Mistral Large (NVIDIA)",
    provider: "nvidia",
    contextWindow: 128e3,
    maxOutputTokens: 4096,
    capabilities: { streaming: true, functionCalling: true },
    pricing: { input: 0, output: 0 }
  }
};
var MODEL_ALIASES = [
  { alias: "auto", model: "omni-llm/auto" },
  { alias: "sonnet", model: "claude-sonnet-4" },
  { alias: "opus", model: "claude-opus-4" },
  { alias: "haiku", model: "claude-haiku-4" },
  { alias: "gpt", model: "gpt-4o" },
  { alias: "gpt-mini", model: "gpt-4o-mini" },
  { alias: "flash", model: "gemini-2.5-flash" },
  { alias: "pro", model: "gemini-2.5-pro" },
  { alias: "deepseek", model: "deepseek-v3" },
  { alias: "grok", model: "grok-3" },
  { alias: "grok-reasoning", model: "grok-3-fast" },
  { alias: "kimi", model: "kimi-k2.5" },
  { alias: "big-pickle", model: "big-pickle", provider: "opencode" },
  { alias: "gpt-nano", model: "gpt-5-nano", provider: "opencode" },
  { alias: "reasoner", model: "o3-mini" },
  { alias: "reasoning", model: "o3" },
  { alias: "glm5", model: "z-ai/glm5" },
  { alias: "nemotron", model: "nvidia/llama-3.1-nemotron-70b-instruct" }
];
function toOpenClawModel(m) {
  return {
    id: m.id,
    name: m.name,
    api: "openai-completions",
    reasoning: m.capabilities?.reasoning ?? false,
    input: m.capabilities?.vision ? ["text", "image"] : ["text"],
    cost: {
      input: m.pricing?.input ?? 0,
      output: m.pricing?.output ?? 0,
      cacheRead: 0,
      cacheWrite: 0
    },
    contextWindow: m.contextWindow,
    maxTokens: m.maxOutputTokens
  };
}
var ALIAS_MODELS = MODEL_ALIASES.map((alias) => {
  const target = MODELS[alias.model.replace("omni-llm/", "")];
  if (!target) return null;
  return toOpenClawModel({ ...target, id: alias.alias, name: `${alias.alias} \u2192 ${target.name}` });
}).filter((m) => m !== null);
var OPENCLAW_MODELS = [
  // Smart routing meta-model
  {
    id: "auto",
    name: "OmniLLM Smart Router",
    api: "openai-completions",
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 2e5,
    maxTokens: 64e3
  },
  // Convert all regular models
  ...Object.values(MODELS).map(toOpenClawModel),
  // Add aliases
  ...ALIAS_MODELS
];
function buildProviderModels(baseUrl) {
  return {
    baseUrl: `${baseUrl}/v1`,
    api: "openai-completions",
    apiKey: "local-proxy",
    models: OPENCLAW_MODELS
  };
}
function getModel(modelId) {
  return MODELS[modelId];
}
function resolveModelAlias(alias) {
  const found = MODEL_ALIASES.find((a) => a.alias === alias);
  return found?.model || alias;
}
function getModelsByProvider(provider) {
  return Object.values(MODELS).filter((m) => m.provider === provider);
}
function getFreeModels() {
  return Object.values(MODELS).filter((m) => m.pricing?.input === 0);
}
function isAgenticModel(modelId) {
  const model = MODELS[modelId];
  return model?.capabilities?.functionCalling ?? false;
}
function getAgenticModels() {
  return Object.values(MODELS).filter((m) => m.capabilities?.functionCalling).map((m) => m.id);
}
function getModelContextWindow(modelId) {
  return MODELS[modelId]?.contextWindow;
}

// src/provider.ts
var DEFAULT_PORT = 8403;
function getProxyPort() {
  const envPort = process.env.OMNI_LLM_PORT;
  if (envPort) {
    const parsed = parseInt(envPort, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed < 65536) return parsed;
  }
  return DEFAULT_PORT;
}
var omniLLMProvider = {
  id: "omni-llm",
  label: "OmniLLM",
  docsPath: "https://github.com/omni-llm/omni-provider",
  aliases: ["omni"],
  envVars: [
    "OPENROUTER_API_KEY",
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "GOOGLE_API_KEY",
    "XAI_API_KEY",
    "DEEPSEEK_API_KEY",
    "MOONSHOT_API_KEY",
    "OPENCODE_API_KEY"
  ],
  get models() {
    const port = getProxyPort();
    return buildProviderModels(`http://127.0.0.1:${port}`);
  },
  auth: []
};

// src/version.ts
var VERSION = "1.0.0";

// src/config/index.ts
function loadProviderConfig(pluginConfig) {
  const defaultConfig = {
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
    chutes: { enabled: false }
  };
  let config = { ...defaultConfig };
  if (pluginConfig?.providers) {
    const providers = pluginConfig.providers;
    for (const [provider, cfg] of Object.entries(providers)) {
      if (isValidProvider(provider)) {
        config[provider] = { ...defaultConfig[provider], ...cfg };
      }
    }
  }
  config = applyEnvOverrides(config);
  return { providers: config, routing: pluginConfig?.routing };
}
function applyEnvOverrides(config) {
  if (process.env.OPENROUTER_API_KEY) {
    config.openrouter = { ...config.openrouter, enabled: true, apiKey: process.env.OPENROUTER_API_KEY };
  }
  if (process.env.OPENAI_API_KEY) {
    config.openai = { ...config.openai, enabled: true, apiKey: process.env.OPENAI_API_KEY };
  }
  if (process.env.ANTHROPIC_API_KEY) {
    config.anthropic = { ...config.anthropic, enabled: true, apiKey: process.env.ANTHROPIC_API_KEY };
  }
  if (process.env.GOOGLE_API_KEY) {
    config.google = { ...config.google, enabled: true, apiKey: process.env.GOOGLE_API_KEY };
  }
  if (process.env.XAI_API_KEY) {
    config.xai = { ...config.xai, enabled: true, apiKey: process.env.XAI_API_KEY };
  }
  if (process.env.DEEPSEEK_API_KEY) {
    config.deepseek = { ...config.deepseek, enabled: true, apiKey: process.env.DEEPSEEK_API_KEY };
  }
  if (process.env.MOONSHOT_API_KEY) {
    config.moonshot = { ...config.moonshot, enabled: true, apiKey: process.env.MOONSHOT_API_KEY };
  }
  if (process.env.OPENCODE_API_KEY) {
    config.opencode = { ...config.opencode, enabled: true, apiKey: process.env.OPENCODE_API_KEY };
  }
  if (process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT) {
    config.azure = {
      ...config.azure,
      enabled: true,
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      baseUrl: process.env.AZURE_OPENAI_ENDPOINT
    };
  }
  if (process.env.ANYSCALE_API_KEY) {
    config.anyscale = { ...config.anyscale, enabled: true, apiKey: process.env.ANYSCALE_API_KEY };
  }
  if (process.env.TOGETHER_API_KEY) {
    config.together = { ...config.together, enabled: true, apiKey: process.env.TOGETHER_API_KEY };
  }
  if (process.env.FIREWORKS_API_KEY) {
    config.fireworks = { ...config.fireworks, enabled: true, apiKey: process.env.FIREWORKS_API_KEY };
  }
  if (process.env.MISTRAL_API_KEY) {
    config.mistral = { ...config.mistral, enabled: true, apiKey: process.env.MISTRAL_API_KEY };
  }
  if (process.env.COHERE_API_KEY) {
    config.cohere = { ...config.cohere, enabled: true, apiKey: process.env.COHERE_API_KEY };
  }
  if (process.env.PERPLEXITY_API_KEY) {
    config.perplexity = { ...config.perplexity, enabled: true, apiKey: process.env.PERPLEXITY_API_KEY };
  }
  if (process.env.CHUTES_API_KEY) {
    config.chutes = { ...config.chutes, enabled: true, apiKey: process.env.CHUTES_API_KEY };
  }
  return config;
}
function isValidProvider(provider) {
  const validProviders = [
    "openrouter",
    "openai",
    "anthropic",
    "google",
    "xai",
    "deepseek",
    "moonshot",
    "opencode",
    "azure",
    "anyscale",
    "together",
    "fireworks",
    "mistral",
    "cohere",
    "perplexity",
    "chutes"
  ];
  return validProviders.includes(provider);
}
function loadApiKeysFromEnv() {
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
    chutes: { apiKey: process.env.CHUTES_API_KEY }
  };
}

// src/stats.ts
async function getStats(days) {
  return Array.from({ length: days }, (_, i) => ({
    date: new Date(Date.now() - i * 24 * 60 * 60 * 1e3).toISOString().split("T")[0],
    requests: 0,
    promptTokens: 0,
    completionTokens: 0,
    cost: 0
  }));
}
function formatStatsAscii(stats) {
  if (stats.length === 0) return "No stats available";
  const lines = [
    "OmniLLM Usage Statistics",
    "========================",
    "",
    "Date        | Requests | Tokens  | Cost",
    "------------|----------|---------|-------"
  ];
  for (const day of stats) {
    const tokens = day.promptTokens + day.completionTokens;
    lines.push(
      `${day.date} | ${day.requests.toString().padStart(8)} | ${tokens.toString().padStart(7)} | $${day.cost.toFixed(4)}`
    );
  }
  return lines.join("\n");
}

// src/proxy.ts
import { createServer } from "http";
var DEFAULT_PORT2 = 8403;
var HEALTH_CHECK_TIMEOUT_MS = 2e3;
var PROVIDER_URLS = {
  openrouter: "https://openrouter.ai/api/v1",
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  google: "https://generativelanguage.googleapis.com/v1beta",
  xai: "https://api.x.ai/v1",
  deepseek: "https://api.deepseek.com/v1",
  moonshot: "https://api.moonshot.cn/v1",
  opencode: "https://opencode.ai/zen/v1",
  azure: "",
  anyscale: "https://api.endpoints.anyscale.com/v1",
  together: "https://api.together.xyz/v1",
  fireworks: "https://api.fireworks.ai/inference/v1",
  mistral: "https://api.mistral.ai/v1",
  cohere: "https://api.cohere.ai/v1",
  perplexity: "https://api.perplexity.ai",
  nvidia: "https://integrate.api.nvidia.com/v1",
  chutes: "https://llm.chutes.ai/v1"
};
var PROVIDER_ENV_VARS = {
  openrouter: "OPENROUTER_API_KEY",
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  google: "GOOGLE_API_KEY",
  xai: "XAI_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
  moonshot: "MOONSHOT_API_KEY",
  opencode: "OPENCODE_API_KEY",
  azure: "AZURE_OPENAI_API_KEY",
  anyscale: "ANYSCALE_API_KEY",
  together: "TOGETHER_API_KEY",
  fireworks: "FIREWORKS_API_KEY",
  mistral: "MISTRAL_API_KEY",
  cohere: "COHERE_API_KEY",
  perplexity: "PERPLEXITY_API_KEY",
  nvidia: "NVIDIA_API_KEY",
  chutes: "CHUTES_API_KEY"
};
function getProxyPort2() {
  const envPort = process.env.OMNI_LLM_PORT;
  if (envPort) {
    const parsed = parseInt(envPort, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed < 65536) return parsed;
  }
  return DEFAULT_PORT2;
}
async function checkExistingProxy(port) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);
  try {
    const response = await fetch(`http://127.0.0.1:${port}/health`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (response.ok) {
      const data = await response.json();
      return data.status === "ok";
    }
    return false;
  } catch {
    clearTimeout(timeoutId);
    return false;
  }
}
function classifyRequest(request) {
  const content = request.messages?.map((m) => m.content).join(" ").toLowerCase() || "";
  if (/prove|explain.*step|calculate|derive|logic|proof|theorem|math|code|debug|analyze|complex/i.test(content)) {
    return "reasoning";
  }
  if (request.messages?.some((m) => typeof m.content === "object" && Array.isArray(m.content) && m.content.some((p) => p.type === "image_url"))) {
    return "vision";
  }
  if (content.length < 200) return "simple";
  if (content.length < 2e3) return "medium";
  return "complex";
}
function getAllModelsForTier(tier) {
  const tierModels = {
    simple: [
      // Rotate between OpenCode Big Pickle and OpenRouter free auto router
      { provider: "opencode", model: "big-pickle", isPaid: false },
      { provider: "openrouter", model: "openrouter/auto", isPaid: false },
      // Other OpenCode free models
      { provider: "opencode", model: "kimi-k2.5-free", isPaid: false },
      { provider: "opencode", model: "gpt-5-nano", isPaid: false },
      { provider: "opencode", model: "minimax-m2.5-free", isPaid: false },
      // Additional fallbacks
      { provider: "chutes", model: "chutes/llama-3.1-70b", isPaid: false },
      { provider: "nvidia", model: "nvidia/llama-3.1-nemotron-70b-instruct", isPaid: false },
      { provider: "nvidia", model: "nvidia/mistral-large", isPaid: false }
    ],
    medium: [
      // Chutes GLM and Kimi first
      { provider: "chutes", model: "zai-org/GLM-5-TEE", isPaid: false },
      { provider: "chutes", model: "moonshotai/Kimi-K2.5-TEE", isPaid: false },
      // OpenCode as backup
      { provider: "opencode", model: "gpt-5-nano", isPaid: false },
      // OpenRouter GLM
      { provider: "openrouter", model: "z-ai/glm-4.5", isPaid: false },
      { provider: "openrouter", model: "z-ai/glm-4.5-air", isPaid: false },
      // NVIDIA
      { provider: "nvidia", model: "nvidia/llama-3.1-nemotron-70b-instruct", isPaid: false },
      { provider: "nvidia", model: "nvidia/mistral-large", isPaid: false }
    ],
    complex: [
      // Chutes GLM and Kimi
      { provider: "chutes", model: "zai-org/GLM-5-TEE", isPaid: false },
      { provider: "chutes", model: "moonshotai/Kimi-K2.5-TEE", isPaid: false },
      // OpenRouter
      { provider: "openrouter", model: "z-ai/glm-4.5", isPaid: false },
      // NVIDIA
      { provider: "nvidia", model: "nvidia/mistral-large", isPaid: false },
      // Paid fallbacks
      { provider: "openrouter", model: "anthropic/claude-sonnet-4", isPaid: true },
      { provider: "openrouter", model: "google/gemini-2.5-pro", isPaid: true },
      { provider: "openrouter", model: "openai/gpt-4o", isPaid: true }
    ],
    reasoning: [
      // Chutes Kimi for reasoning
      { provider: "chutes", model: "moonshotai/Kimi-K2.5-TEE", isPaid: false },
      // OpenRouter o3-mini for reasoning
      { provider: "openrouter", model: "openai/o3-mini", isPaid: true },
      // HIGHEST COMPLEXITY - Opus 4.6 via OpenRouter
      { provider: "openrouter", model: "anthropic/claude-opus-4", isPaid: true }
    ],
    vision: [
      { provider: "opencode", model: "big-pickle", isPaid: false },
      { provider: "openrouter", model: "google/gemini-2.5-flash", isPaid: false },
      { provider: "openrouter", model: "anthropic/claude-sonnet-4", isPaid: true },
      { provider: "openrouter", model: "openai/gpt-4o", isPaid: true }
    ]
  };
  const allModels = tierModels[tier] || tierModels.medium;
  return allModels.filter(({ provider }) => {
    const apiKey = getApiKey(provider);
    return !!apiKey;
  });
}
async function routeToProviderWithFallback(req, res, request, provider, modelId, apiKey) {
  try {
    const baseUrl = PROVIDER_URLS[provider];
    const providerRequest = buildProviderRequest(request, provider, modelId);
    console.log(`[OmniLLM] Attempting ${provider}/${modelId}`);
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        ...provider === "openrouter" ? { "HTTP-Referer": "http://localhost:8403", "X-Title": "OmniLLM" } : {}
      },
      body: JSON.stringify(providerRequest)
    });
    if (!response.ok) {
      const errorText = await response.text();
      const isRateLimit = response.status === 429;
      const isServerError = response.status >= 500;
      console.error(`[OmniLLM] ${provider}/${modelId} failed (${response.status})${isRateLimit ? " [RATE LIMITED]" : ""}: ${errorText.substring(0, 200)}`);
      if (isRateLimit || isServerError) {
        return { success: false };
      }
      if (!res.headersSent) {
        res.writeHead(response.status, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          error: `Provider error (${provider}): ${errorText}`,
          provider,
          model: modelId
        }));
      }
      return { success: false };
    }
    const isStreaming = request.stream === true;
    if (isStreaming && response.body) {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      });
      const reader = response.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      } finally {
        res.end();
      }
    } else {
      const data = await response.text();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(data);
    }
    return { success: true };
  } catch (error) {
    console.error(`[OmniLLM] Exception routing to ${provider}/${modelId}:`, error);
    return { success: false };
  }
}
function getFirstAvailableProvider() {
  const priority = [
    "opencode",
    // Free models
    "chutes",
    // Cheaper/discounted models
    "nvidia",
    // Free tier
    "openrouter",
    // Free tier models
    "openai",
    "anthropic",
    "google",
    "xai",
    "deepseek",
    "moonshot"
  ];
  for (const provider of priority) {
    const apiKey = getApiKey(provider);
    if (apiKey) {
      let modelId = "gpt-4o";
      if (provider === "opencode") modelId = "big-pickle";
      else if (provider === "chutes") modelId = "chutes/llama-3.1-70b";
      else if (provider === "nvidia") modelId = "nvidia/llama-3.1-nemotron-70b-instruct";
      else if (provider === "openrouter") modelId = "google/gemini-2.5-flash";
      else if (provider === "anthropic") modelId = "claude-sonnet-4";
      else if (provider === "google") modelId = "gemini-2.5-flash";
      else if (provider === "xai") modelId = "grok-3";
      else if (provider === "deepseek") modelId = "deepseek-v3";
      else if (provider === "moonshot") modelId = "kimi-k2.5";
      return { provider, modelId };
    }
  }
  return null;
}
function resolveProvider(model) {
  if (model.startsWith("omni-llm/")) {
    model = model.replace("omni-llm/", "");
  }
  if (model === "auto" || model === "omni-llm/auto") {
    return { provider: "opencode", modelId: "big-pickle" };
  }
  const resolvedModelId = resolveModelAlias(model);
  const modelInfo = getModel(resolvedModelId);
  if (modelInfo) {
    return { provider: modelInfo.provider, modelId: modelInfo.id };
  }
  for (const provider of Object.keys(PROVIDER_URLS)) {
    if (resolvedModelId.startsWith(provider) || resolvedModelId.startsWith(`${provider}/`)) {
      return {
        provider,
        modelId: resolvedModelId.replace(`${provider}/`, "")
      };
    }
  }
  const available = getFirstAvailableProvider();
  if (available) {
    return available;
  }
  return { provider: "openrouter", modelId: resolvedModelId };
}
function getApiKey(provider) {
  const envVar = PROVIDER_ENV_VARS[provider];
  return process.env[envVar];
}
async function handleChatCompletions(req, res, body) {
  try {
    const request = JSON.parse(body);
    const model = request.model || "auto";
    console.log(`[OmniLLM] Request for model: ${model}`);
    if (model === "auto" || model === "omni-llm/auto") {
      const tier = classifyRequest(request);
      const models = getAllModelsForTier(tier);
      if (models.length === 0) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "No providers available" }));
        return;
      }
      console.log(`[OmniLLM] Smart routing: tier=${tier}, trying ${models.length} models`);
      for (let i = 0; i < models.length; i++) {
        const { provider: provider2, model: modelId2, isPaid } = models[i];
        const apiKey2 = getApiKey(provider2);
        if (!apiKey2) {
          console.log(`[OmniLLM] Skipping ${provider2}/${modelId2} - no API key`);
          continue;
        }
        console.log(`[OmniLLM] Attempt ${i + 1}/${models.length}: ${provider2}/${modelId2} (${isPaid ? "paid" : "free"})`);
        const result = await routeToProviderWithFallback(req, res, request, provider2, modelId2, apiKey2);
        if (result.success) {
          console.log(`[OmniLLM] Success with ${provider2}/${modelId2}`);
          return;
        }
        if (i === models.length - 1) {
          console.log(`[OmniLLM] All ${models.length} models failed`);
          return;
        }
        console.log(`[OmniLLM] ${provider2}/${modelId2} failed, rotating to next...`);
      }
      return;
    }
    const resolved = resolveProvider(model);
    if (!resolved) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unable to resolve model" }));
      return;
    }
    const { provider, modelId } = resolved;
    const apiKey = getApiKey(provider);
    if (!apiKey) {
      const openrouterKey = getApiKey("openrouter");
      if (openrouterKey && provider !== "openrouter") {
        console.log(`[OmniLLM] No API key for ${provider}, falling back to OpenRouter`);
        await routeToOpenRouter(req, res, request, modelId, openrouterKey);
        return;
      }
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        error: `No API key configured for provider: ${provider}. Set ${PROVIDER_ENV_VARS[provider]} environment variable.`
      }));
      return;
    }
    await routeToProvider(req, res, request, provider, modelId, apiKey);
  } catch (error) {
    console.error("[OmniLLM] Error handling request:", error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      error: error instanceof Error ? error.message : "Internal server error"
    }));
  }
}
async function routeToProvider(req, res, request, provider, modelId, apiKey) {
  const baseUrl = PROVIDER_URLS[provider];
  const providerRequest = buildProviderRequest(request, provider, modelId);
  console.log(`[OmniLLM] Routing to ${provider} with model ${modelId}`);
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      ...provider === "openrouter" ? { "HTTP-Referer": "http://localhost:8403", "X-Title": "OmniLLM" } : {}
    },
    body: JSON.stringify(providerRequest)
  });
  if (!response.ok) {
    const error = await response.text();
    console.error(`[OmniLLM] Provider error (${response.status}):`, error);
    res.writeHead(response.status, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: `Provider error: ${error}` }));
    return;
  }
  const isStreaming = request.stream === true;
  if (isStreaming && response.body) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    });
    const reader = response.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    } finally {
      res.end();
    }
  } else {
    const data = await response.text();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(data);
  }
}
async function routeToOpenRouter(req, res, request, modelId, apiKey) {
  const openrouterModel = modelId.includes("/") ? modelId : `${getProviderFromModel(modelId)}/${modelId}`;
  console.log(`[OmniLLM] Routing through OpenRouter: ${openrouterModel}`);
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "http://localhost:8403",
      "X-Title": "OmniLLM"
    },
    body: JSON.stringify({
      ...request,
      model: openrouterModel
    })
  });
  if (!response.ok) {
    const error = await response.text();
    console.error(`[OmniLLM] OpenRouter error (${response.status}):`, error);
    res.writeHead(response.status, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: `OpenRouter error: ${error}` }));
    return;
  }
  const isStreaming = request.stream === true;
  if (isStreaming && response.body) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    });
    const reader = response.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    } finally {
      res.end();
    }
  } else {
    const data = await response.text();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(data);
  }
}
function buildProviderRequest(request, provider, modelId) {
  const baseRequest = {
    model: modelId,
    messages: request.messages,
    temperature: request.temperature,
    max_tokens: request.max_tokens || request.maxTokens,
    top_p: request.top_p || request.topP,
    stream: request.stream,
    // Pass tools for tool calling support
    ...request.tools && { tools: request.tools },
    ...request.tool_choice && { tool_choice: request.tool_choice }
  };
  switch (provider) {
    case "chutes":
      return {
        model: modelId,
        messages: request.messages,
        max_tokens: request.max_tokens || request.maxTokens || 4096,
        temperature: request.temperature,
        top_p: request.top_p || request.topP,
        stream: request.stream,
        // Pass tools for tool calling support
        ...request.tools && { tools: request.tools },
        ...request.tool_choice && { tool_choice: request.tool_choice }
      };
    case "anthropic":
      return {
        model: modelId,
        messages: request.messages,
        max_tokens: request.max_tokens || request.maxTokens || 4096,
        temperature: request.temperature,
        top_p: request.top_p || request.topP,
        stream: request.stream,
        // Pass tools for tool calling support
        ...request.tools && { tools: request.tools },
        ...request.tool_choice && { tool_choice: request.tool_choice }
      };
    case "google":
      return {
        model: modelId,
        contents: request.messages.map((m) => ({
          role: m.role === "assistant" ? "model" : m.role,
          parts: [{ text: m.content }]
        })),
        generationConfig: {
          temperature: request.temperature,
          maxOutputTokens: request.max_tokens || request.maxTokens,
          topP: request.top_p || request.topP
        }
      };
    default:
      return baseRequest;
  }
}
function getProviderFromModel(modelId) {
  const prefixes = {
    "gpt": "openai",
    "claude": "anthropic",
    "gemini": "google",
    "grok": "xai",
    "deepseek": "deepseek",
    "kimi": "moonshot",
    "big-pickle": "opencode",
    "glm5": "nvidia"
  };
  for (const [prefix, provider] of Object.entries(prefixes)) {
    if (modelId.toLowerCase().includes(prefix)) {
      return provider;
    }
  }
  return "openrouter";
}
async function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}
async function startProxy(options = {}) {
  const port = options.port || getProxyPort2();
  const existing = await checkExistingProxy(port);
  if (existing) {
    console.log(`[OmniLLM] Proxy already running on port ${port}`);
    return {
      port,
      baseUrl: `http://127.0.0.1:${port}`,
      close: async () => {
      }
    };
  }
  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      if (req.method === "OPTIONS") {
        res.writeHead(200);
        res.end();
        return;
      }
      if (req.url === "/health" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", provider: "omni-llm" }));
        return;
      }
      if (req.url === "/v1/models" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          object: "list",
          data: Object.keys(getModel).map((id) => ({
            id,
            object: "model",
            created: Date.now(),
            owned_by: "omni-llm"
          }))
        }));
        return;
      }
      if (req.url === "/v1/chat/completions" && req.method === "POST") {
        try {
          const body = await readBody(req);
          await handleChatCompletions(req, res, body);
        } catch (error) {
          console.error("[OmniLLM] Error:", error);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Internal server error" }));
        }
        return;
      }
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
    });
    server.listen(port, "127.0.0.1", () => {
      const address = server.address();
      console.log(`[OmniLLM] Proxy listening on port ${address.port}`);
      if (options.onReady) {
        options.onReady(address.port);
      }
      resolve({
        port: address.port,
        baseUrl: `http://127.0.0.1:${address.port}`,
        close: () => {
          return new Promise((res) => {
            server.close(() => res());
          });
        }
      });
    });
    server.on("error", (error) => {
      console.error("[OmniLLM] Server error:", error);
      if (options.onError) {
        options.onError(error);
      }
      reject(error);
    });
  });
}

// src/index.ts
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";
var activeProxyHandle = null;
async function startProxyServer(api) {
  try {
    const proxy = await startProxy({
      port: getProxyPort(),
      onReady: (port) => {
        api.logger.info(`OmniLLM proxy listening on port ${port}`);
      },
      onError: (error) => {
        api.logger.error(`OmniLLM proxy error: ${error.message}`);
      }
    });
    activeProxyHandle = proxy;
    const healthy = await waitForProxyHealth(proxy.port, 5e3);
    if (!healthy) {
      api.logger.warn("OmniLLM proxy health check timed out");
    }
  } catch (err) {
    api.logger.error(`Failed to start OmniLLM proxy: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
}
async function waitForProxyHealth(port, timeoutMs = 3e3) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`);
      if (res.ok) return true;
    } catch {
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}
function isCompletionMode() {
  return process.argv.some((arg, i) => arg === "completion" && i >= 1 && i <= 3);
}
function injectModelsConfig(logger) {
  const configDir = join(homedir(), ".openclaw");
  const configPath = join(configDir, "openclaw.json");
  let config = {};
  let needsWrite = false;
  if (!existsSync(configDir)) {
    try {
      mkdirSync(configDir, { recursive: true });
    } catch {
      return;
    }
  }
  if (existsSync(configPath)) {
    try {
      const content = readFileSync(configPath, "utf-8").trim();
      if (content) config = JSON.parse(content);
      else needsWrite = true;
    } catch {
      config = {};
      needsWrite = true;
    }
  } else {
    needsWrite = true;
  }
  if (!config.models) {
    config.models = {};
    needsWrite = true;
  }
  const models = config.models;
  if (!models.providers) {
    models.providers = {};
    needsWrite = true;
  }
  const proxyPort = getProxyPort();
  const expectedBaseUrl = `http://127.0.0.1:${proxyPort}/v1`;
  const providers = models.providers;
  if (!providers["omni-llm"]) {
    providers["omni-llm"] = {
      baseUrl: expectedBaseUrl,
      api: "openai-completions",
      apiKey: "local-proxy",
      models: OPENCLAW_MODELS
    };
    needsWrite = true;
  } else {
    const omni = providers["omni-llm"];
    let fixed = false;
    if (!omni.baseUrl || omni.baseUrl !== expectedBaseUrl) {
      omni.baseUrl = expectedBaseUrl;
      fixed = true;
    }
    if (!omni.api) {
      omni.api = "openai-completions";
      fixed = true;
    }
    if (!omni.apiKey) {
      omni.apiKey = "local-proxy";
      fixed = true;
    }
    const currentModels = omni.models;
    if (!currentModels || !Array.isArray(currentModels) || currentModels.length !== OPENCLAW_MODELS.length) {
      omni.models = OPENCLAW_MODELS;
      fixed = true;
    }
    if (fixed) needsWrite = true;
  }
  if (!config.agents) {
    config.agents = {};
    needsWrite = true;
  }
  const agents = config.agents;
  if (!agents.defaults) {
    agents.defaults = {};
    needsWrite = true;
  }
  const defaults = agents.defaults;
  if (!defaults.model) {
    defaults.model = {};
    needsWrite = true;
  }
  const model = defaults.model;
  if (!model.primary) {
    model.primary = "omni-llm/auto";
    needsWrite = true;
  }
  const KEY_ALIASES = [
    { id: "auto", alias: "auto" },
    { id: "sonnet", alias: "sonnet" },
    { id: "opus", alias: "opus" },
    { id: "haiku", alias: "haiku" },
    { id: "gpt", alias: "gpt" },
    { id: "flash", alias: "flash" },
    { id: "deepseek", alias: "deepseek" },
    { id: "grok", alias: "grok" },
    { id: "kimi", alias: "kimi" },
    { id: "reasoner", alias: "reasoner" }
  ];
  if (!defaults.models) {
    defaults.models = {};
    needsWrite = true;
  }
  const allowlist = defaults.models;
  for (const m of KEY_ALIASES) {
    const fullId = `omni-llm/${m.id}`;
    if (!allowlist[fullId]) {
      allowlist[fullId] = { alias: m.alias };
      needsWrite = true;
    }
  }
  if (needsWrite) {
    try {
      writeFileSync(configPath, JSON.stringify(config, null, 2));
      logger.info(`Updated OpenClaw config with OmniLLM models`);
    } catch {
    }
  }
}
async function createStatsCommand() {
  return {
    name: "stats",
    description: "Show OmniLLM usage statistics and cost savings",
    acceptsArgs: true,
    requireAuth: false,
    handler: async (ctx) => {
      const days = parseInt(ctx.args?.trim() || "7", 10) || 7;
      try {
        const stats = await getStats(Math.min(days, 30));
        return { text: ["```", formatStatsAscii(stats), "```"].join("\n") };
      } catch (err) {
        return {
          text: `Failed to load stats: ${err instanceof Error ? err.message : String(err)}`,
          isError: true
        };
      }
    }
  };
}
async function createProvidersCommand(api) {
  return {
    name: "providers",
    description: "Show configured OmniLLM provider status",
    acceptsArgs: false,
    requireAuth: false,
    handler: async () => {
      const apiKeys = loadApiKeysFromEnv();
      const providers = Object.entries(apiKeys).filter(([_, cfg]) => cfg && typeof cfg === "object" && "apiKey" in cfg && cfg.apiKey).map(([name, cfg]) => {
        const config = cfg;
        const key = config.apiKey || "";
        const masked = key.length > 8 ? `${key.slice(0, 4)}...${key.slice(-4)}` : "****";
        return `\u2022 **${name}**: \`${masked}\` \u2705`;
      });
      if (providers.length === 0) {
        return {
          text: [
            "\u{1F511} **OmniLLM API Keys**",
            "",
            "No API keys configured!",
            "",
            "**Quickest setup (one key \u2192 all models):**",
            "\u2022 `OPENROUTER_API_KEY=sk-or-...`",
            "",
            "**Or configure individual providers:**",
            "\u2022 `OPENAI_API_KEY=sk-...`",
            "\u2022 `ANTHROPIC_API_KEY=sk-ant-...`",
            "\u2022 `GOOGLE_API_KEY=AIza...`",
            "\u2022 `XAI_API_KEY=xai-...`",
            "\u2022 `DEEPSEEK_API_KEY=sk-...`",
            "",
            "**Or edit:** `~/.openclaw/omni-llm/config.json`"
          ].join("\n")
        };
      }
      return {
        text: [
          "\u{1F511} **OmniLLM API Keys**",
          "",
          ...providers,
          "",
          `**${providers.length} providers configured**`
        ].join("\n")
      };
    }
  };
}
var plugin = {
  id: "omni-llm",
  name: "OmniLLM",
  description: "Multi-provider LLM router \u2014 your keys, smart routing, maximum flexibility",
  version: VERSION,
  register(api) {
    const isDisabled = process.env.OMNI_LLM_DISABLED === "true" || process.env.OMNI_LLM_DISABLED === "1";
    if (isDisabled) {
      api.logger.info("OmniLLM disabled (OMNI_LLM_DISABLED=true)");
      return;
    }
    if (isCompletionMode()) {
      api.registerProvider(omniLLMProvider);
      return;
    }
    const { providers } = loadProviderConfig(api.pluginConfig || {});
    const apiKeys = loadApiKeysFromEnv();
    const enabledProviders = Object.entries(providers).filter(([_, cfg]) => cfg.enabled).map(([provider]) => provider);
    if (enabledProviders.length === 0) {
      api.logger.warn("OmniLLM: No providers enabled! Configure at least one provider.");
      return;
    }
    api.logger.info(`OmniLLM: Configured providers: ${enabledProviders.join(", ")}`);
    api.registerProvider(omniLLMProvider);
    injectModelsConfig(api.logger);
    const runtimePort = getProxyPort();
    if (!api.config.models) api.config.models = { providers: {} };
    if (!api.config.models.providers) api.config.models.providers = {};
    api.config.models.providers["omni-llm"] = {
      baseUrl: `http://127.0.0.1:${runtimePort}/v1`,
      api: "openai-completions",
      apiKey: "local-proxy",
      models: OPENCLAW_MODELS
    };
    if (!api.config.agents) api.config.agents = {};
    const agents = api.config.agents;
    if (!agents.defaults) agents.defaults = {};
    const defaults = agents.defaults;
    if (!defaults.model) defaults.model = {};
    const model = defaults.model;
    if (!model.primary) model.primary = "omni-llm/auto";
    api.logger.info(`OmniLLM registered (${enabledProviders.length} providers)`);
    createStatsCommand().then((cmd) => api.registerCommand(cmd)).catch(() => {
    });
    createProvidersCommand(api).then((cmd) => api.registerCommand(cmd)).catch(() => {
    });
    api.registerService({
      id: "omni-llm-service",
      start: async () => {
        await startProxyServer(api);
      },
      stop: async () => {
        if (activeProxyHandle) {
          try {
            await activeProxyHandle.close();
          } catch {
          }
          activeProxyHandle = null;
        }
      }
    });
    startProxyServer(api).catch((err) => {
      api.logger.error(`Failed to start proxy: ${err instanceof Error ? err.message : String(err)}`);
    });
  }
};
var index_default = plugin;
export {
  MODEL_ALIASES,
  OPENCLAW_MODELS,
  VERSION,
  buildProviderModels,
  index_default as default,
  formatStatsAscii,
  getAgenticModels,
  getFreeModels,
  getModel,
  getModelContextWindow,
  getModelsByProvider,
  getProxyPort,
  getStats,
  isAgenticModel,
  omniLLMProvider,
  resolveModelAlias,
  startProxy
};
//# sourceMappingURL=index.js.map