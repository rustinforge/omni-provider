/**
 * Commands - Providers
 * 
 * Show configured LLM providers
 */

import type { OpenClawPluginCommandDefinition, PluginCommandContext, PluginCommandResult } from "../types/openclaw.js";
import type { LLMProviderManager } from "../core/manager.js";

export async function createProvidersCommand(manager: LLMProviderManager): Promise<OpenClawPluginCommandDefinition> {
  return {
    name: "providers",
    description: "Show configured LLM providers",
    acceptsArgs: false,
    requireAuth: false,
    handler: async (context: PluginCommandContext): Promise<PluginCommandResult> => {
      const providers = manager.getEnabledProviders();
      const lines = ["**OmniLLM Providers:**", ""];
      for (const p of providers) {
        lines.push(`• ${p}`);
      }
      return { text: lines.join("\n") };
    },
  };
}
