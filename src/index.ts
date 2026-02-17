/**
 * OmniLLM - OpenClaw Provider Plugin
 * 
 * Multi-provider LLM router that registers as an OpenClaw provider.
 * Supports OpenRouter, OpenAI, Anthropic, Google, xAI, DeepSeek, Moonshot, OpenCode, and more.
 * 
 * Usage:
 *   openclaw plugins install ./omni-provider
 *   export OPENROUTER_API_KEY=sk-or-...
 *   openclaw models set omni-llm/auto
 */

import type {
  OpenClawPluginDefinition,
  OpenClawPluginApi,
  PluginCommandContext,
  OpenClawPluginCommandDefinition,
} from "./types/openclaw.js";
import { omniLLMProvider, getProxyPort } from "./provider.js";
import { VERSION } from "./version.js";
import { OPENCLAW_MODELS, buildProviderModels } from "./models.js";
import { loadProviderConfig, loadApiKeysFromEnv } from "./config/index.js";
import { getStats, formatStatsAscii } from "./stats.js";
import { startProxy, type ProxyHandle } from "./proxy.js";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// Track active proxy handle for cleanup
let activeProxyHandle: ProxyHandle | null = null;

/**
 * Start the proxy server in background
 */
async function startProxyServer(api: OpenClawPluginApi): Promise<void> {
  try {
    const proxy = await startProxy({
      port: getProxyPort(),
      onReady: (port) => {
        api.logger.info(`OmniLLM proxy listening on port ${port}`);
      },
      onError: (error) => {
        api.logger.error(`OmniLLM proxy error: ${error.message}`);
      },
    });
    
    activeProxyHandle = proxy;
    
    // Health check
    const healthy = await waitForProxyHealth(proxy.port, 5000);
    if (!healthy) {
      api.logger.warn("OmniLLM proxy health check timed out");
    }
  } catch (err) {
    api.logger.error(`Failed to start OmniLLM proxy: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
}

/**
 * Wait for proxy to be healthy
 */
async function waitForProxyHealth(port: number, timeoutMs = 3000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`);
      if (res.ok) return true;
    } catch { /* not ready */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}

/**
 * Check if running in completion mode (direct model usage)
 */
function isCompletionMode(): boolean {
  return process.argv.some((arg, i) => arg === "completion" && i >= 1 && i <= 3);
}

/**
 * Inject OmniLLM models into OpenClaw config file
 * This ensures the models are available in the UI
 */
function injectModelsConfig(logger: { info: (msg: string) => void }): void {
  const configDir = join(homedir(), ".openclaw");
  const configPath = join(configDir, "openclaw.json");

  let config: Record<string, unknown> = {};
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
  const models = config.models as Record<string, unknown>;
  if (!models.providers) {
    models.providers = {};
    needsWrite = true;
  }

  const proxyPort = getProxyPort();
  const expectedBaseUrl = `http://127.0.0.1:${proxyPort}/v1`;
  const providers = models.providers as Record<string, unknown>;

  if (!providers["omni-llm"]) {
    providers["omni-llm"] = {
      baseUrl: expectedBaseUrl,
      api: "openai-completions",
      apiKey: "local-proxy",
      models: OPENCLAW_MODELS,
    };
    needsWrite = true;
  } else {
    const omni = providers["omni-llm"] as Record<string, unknown>;
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
    const currentModels = omni.models as unknown[];
    if (!currentModels || !Array.isArray(currentModels) || currentModels.length !== OPENCLAW_MODELS.length) {
      omni.models = OPENCLAW_MODELS;
      fixed = true;
    }
    if (fixed) needsWrite = true;
  }

  // Set default model on first install
  if (!config.agents) {
    config.agents = {};
    needsWrite = true;
  }
  const agents = config.agents as Record<string, unknown>;
  if (!agents.defaults) {
    agents.defaults = {};
    needsWrite = true;
  }
  const defaults = agents.defaults as Record<string, unknown>;
  if (!defaults.model) {
    defaults.model = {};
    needsWrite = true;
  }
  const model = defaults.model as Record<string, unknown>;
  if (!model.primary) {
    model.primary = "omni-llm/auto";
    needsWrite = true;
  }

  // Register model aliases
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
    { id: "reasoner", alias: "reasoner" },
  ];

  if (!defaults.models) {
    defaults.models = {};
    needsWrite = true;
  }
  const allowlist = defaults.models as Record<string, unknown>;
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
      // Ignore write errors
    }
  }
}

/**
 * Create the stats command
 */
async function createStatsCommand(): Promise<OpenClawPluginCommandDefinition> {
  return {
    name: "stats",
    description: "Show OmniLLM usage statistics and cost savings",
    acceptsArgs: true,
    requireAuth: false,
    handler: async (ctx: PluginCommandContext) => {
      const days = parseInt(ctx.args?.trim() || "7", 10) || 7;
      try {
        const stats = await getStats(Math.min(days, 30));
        return { text: ["```", formatStatsAscii(stats), "```"].join("\n") };
      } catch (err) {
        return {
          text: `Failed to load stats: ${err instanceof Error ? err.message : String(err)}`,
          isError: true,
        };
      }
    },
  };
}

/**
 * Create the providers command to show configured API keys
 */
async function createProvidersCommand(api: OpenClawPluginApi): Promise<OpenClawPluginCommandDefinition> {
  return {
    name: "providers",
    description: "Show configured OmniLLM provider status",
    acceptsArgs: false,
    requireAuth: false,
    handler: async () => {
      const apiKeys = loadApiKeysFromEnv();
      const providers = Object.entries(apiKeys)
        .filter(([_, cfg]) => cfg && typeof cfg === "object" && "apiKey" in cfg && cfg.apiKey)
        .map(([name, cfg]) => {
          const config = cfg as { apiKey?: string };
          const key = config.apiKey || "";
          const masked = key.length > 8 ? `${key.slice(0, 4)}...${key.slice(-4)}` : "****";
          return `• **${name}**: \`${masked}\` ✅`;
        });

      if (providers.length === 0) {
        return {
          text: [
            "🔑 **OmniLLM API Keys**",
            "",
            "No API keys configured!",
            "",
            "**Quickest setup (one key → all models):**",
            "• `OPENROUTER_API_KEY=sk-or-...`",
            "",
            "**Or configure individual providers:**",
            "• `OPENAI_API_KEY=sk-...`",
            "• `ANTHROPIC_API_KEY=sk-ant-...`",
            "• `GOOGLE_API_KEY=AIza...`",
            "• `XAI_API_KEY=xai-...`",
            "• `DEEPSEEK_API_KEY=sk-...`",
            "",
            "**Or edit:** `~/.openclaw/omni-llm/config.json`",
          ].join("\n"),
        };
      }

      return {
        text: [
          "🔑 **OmniLLM API Keys**",
          "",
          ...providers,
          "",
          `**${providers.length} providers configured**`,
        ].join("\n"),
      };
    },
  };
}

// Main plugin definition
const plugin: OpenClawPluginDefinition = {
  id: "omni-llm",
  name: "OmniLLM",
  description: "Multi-provider LLM router — your keys, smart routing, maximum flexibility",
  version: VERSION,

  register(api: OpenClawPluginApi) {
    const isDisabled = process.env.OMNI_LLM_DISABLED === "true" || process.env.OMNI_LLM_DISABLED === "1";
    if (isDisabled) {
      api.logger.info("OmniLLM disabled (OMNI_LLM_DISABLED=true)");
      return;
    }

    // In completion mode, just register the provider
    if (isCompletionMode()) {
      api.registerProvider(omniLLMProvider);
      return;
    }

    // Load configuration
    const { providers } = loadProviderConfig(api.pluginConfig || {});
    const apiKeys = loadApiKeysFromEnv();

    const enabledProviders = Object.entries(providers)
      .filter(([_, cfg]) => cfg.enabled)
      .map(([provider]) => provider);

    if (enabledProviders.length === 0) {
      api.logger.warn("OmniLLM: No providers enabled! Configure at least one provider.");
      return;
    }

    api.logger.info(`OmniLLM: Configured providers: ${enabledProviders.join(", ")}`);

    // Register the provider with OpenClaw
    api.registerProvider(omniLLMProvider);

    // Inject models into OpenClaw config
    injectModelsConfig(api.logger);

    // Configure runtime models
    const runtimePort = getProxyPort();
    if (!api.config.models) api.config.models = { providers: {} };
    if (!api.config.models.providers) api.config.models.providers = {};
    api.config.models.providers["omni-llm"] = {
      baseUrl: `http://127.0.0.1:${runtimePort}/v1`,
      api: "openai-completions",
      apiKey: "local-proxy",
      models: OPENCLAW_MODELS,
    };

    // Set default model if not configured
    if (!api.config.agents) api.config.agents = {};
    const agents = api.config.agents as Record<string, unknown>;
    if (!agents.defaults) agents.defaults = {};
    const defaults = agents.defaults as Record<string, unknown>;
    if (!defaults.model) defaults.model = {};
    const model = defaults.model as Record<string, unknown>;
    if (!model.primary) model.primary = "omni-llm/auto";

    api.logger.info(`OmniLLM registered (${enabledProviders.length} providers)`);

    // Register commands
    createStatsCommand()
      .then((cmd) => api.registerCommand(cmd))
      .catch(() => {});
    createProvidersCommand(api)
      .then((cmd) => api.registerCommand(cmd))
      .catch(() => {});

    // Register service for cleanup
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
            // Ignore cleanup errors
          }
          activeProxyHandle = null;
        }
      },
    });

    // Start proxy immediately
    startProxyServer(api).catch((err) => {
      api.logger.error(`Failed to start proxy: ${err instanceof Error ? err.message : String(err)}`);
    });
  },
};

export default plugin;

// Re-exports for library usage
export { omniLLMProvider, getProxyPort } from "./provider.js";
export { startProxy } from "./proxy.js";
export type { ProxyHandle } from "./proxy.js";
export {
  OPENCLAW_MODELS,
  MODEL_ALIASES,
  buildProviderModels,
  resolveModelAlias,
  getModel,
  getModelsByProvider,
  getFreeModels,
  isAgenticModel,
  getAgenticModels,
  getModelContextWindow,
} from "./models.js";
export { VERSION } from "./version.js";
export { getStats, formatStatsAscii } from "./stats.js";
export type { DailyStats } from "./stats.js";
export type { AggregatedStats } from "./types.js";
