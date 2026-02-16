/**
 * OmniLLM - Main Plugin Entry
 * 
 * OpenClaw plugin for multi-provider LLM routing.
 * Supports OpenRouter, OpenAI, Anthropic, Google, xAI, DeepSeek, Moonshot, OpenCode, and more.
 */

import type {
  OpenClawPluginDefinition,
  OpenClawPluginApi,
  PluginCommandContext,
  OpenClawPluginCommandDefinition,
} from "openclaw";

import { VERSION } from "./version.js";
import { LLMProviderManager } from "./core/manager.js";
import { createStatsCommand } from "./commands/stats.js";
import { createProvidersCommand } from "./commands/providers.js";
import { loadProviderConfig, loadApiKeysFromEnv, type ApiKeysConfig } from "./config/index.js";
import { OPENCLAW_MODELS, MODEL_ALIASES } from "./models.js";

let manager: LLMProviderManager | null = null;

const plugin: OpenClawPluginDefinition = {
  id: "omni-llm",
  name: "OmniLLM",
  description: "Multi-provider LLM router - OpenRouter, OpenAI, Anthropic, Google, xAI, DeepSeek, OpenCode and more",
  version: VERSION,

  register(api: OpenClawPluginApi) {
    const isDisabled = process.env.OMNI_LLM_DISABLED === "true" || process.env.OMNI_LLM_DISABLED === "1";
    if (isDisabled) {
      api.logger.info("OmniLLM disabled (OMNI_LLM_DISABLED=true)");
      return;
    }

    const { providers: config } = loadProviderConfig(api.pluginConfig || {});
    const apiKeys = loadApiKeysFromEnv();

    const enabledProviders = Object.entries(config.providers)
      .filter(([_, cfg]) => cfg.enabled)
      .map(([provider]) => provider);

    if (enabledProviders.length === 0) {
      api.logger.warn("OmniLLM: No providers enabled! Configure at least one provider.");
      return;
    }

    api.logger.info(`OmniLLM initializing with providers: ${enabledProviders.join(", ")}`);

    manager = new LLMProviderManager(api, config, apiKeys);

    manager.registerAll()
      .then(() => {
        api.logger.info(`OmniLLM ready - ${enabledProviders.length} provider(s) registered`);
      })
      .catch((err) => {
        api.logger.error(`OmniLLM initialization failed: ${err.message}`);
      });

    Promise.all([
      createStatsCommand(),
      createProvidersCommand(manager),
    ]).then(([statsCmd, providersCmd]) => {
      api.registerCommand(statsCmd);
      api.registerCommand(providersCmd);
    }).catch((err) => {
      api.logger.warn(`Failed to register commands: ${err.message}`);
    });

    api.registerService({
      id: "omni-llm",
      start: async () => {
        if (manager) await manager.startAll();
      },
      stop: async () => {
        if (manager) {
          await manager.stopAll();
          manager = null;
        }
      },
    });
  },
};

export default plugin;

export { LLMProviderManager } from "./core/manager.js";
export { BaseLLMProvider } from "./providers/base.js";
export type {
  LLMProvider,
  ProviderConfig,
  ProvidersConfig,
  ModelInfo,
  ResolvedModel,
  ChatCompletionRequest,
  ChatCompletionResponse,
  RoutingDecision,
  RoutingTier,
} from "./types.js";
