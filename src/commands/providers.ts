import type { OpenClawPluginCommandDefinition, PluginCommandContext } from "../types/openclaw.js";
import type { LLMProviderManager } from "../core/manager.js";

export async function createProvidersCommand(manager: LLMProviderManager): Promise<OpenClawPluginCommandDefinition> {
  return {
    name: "providers",
    description: "Show configured LLM providers",
    acceptsArgs: false,
    requireAuth: false,
    handler: async (context: PluginCommandContext) => {
      const providers = manager.getEnabledProviders();
      const lines = ["**OmniLLM Providers:**", ""];
      for (const p of providers) {
        lines.push(`• ${p}`);
      }
      await context.reply(lines.join("\n"));
    },
  };
}
