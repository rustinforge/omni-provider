import type { OpenClawPluginCommandDefinition } from "openclaw";
import type { LLMProviderManager } from "../core/manager";

export async function createProvidersCommand(manager: LLMProviderManager): Promise<OpenClawPluginCommandDefinition> {
  return {
    name: "providers",
    description: "Show configured LLM providers",
    acceptsArgs: false,
    requireAuth: false,
    handler: async () => {
      const providers = manager.getEnabledProviders();
      const lines = ["**OmniLLM Providers:**", ""];
      for (const p of providers) {
        lines.push(`• ${p}`);
      }
      return { text: lines.join("\n") };
    },
  };
}
