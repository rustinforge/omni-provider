import type { OpenClawPluginCommandDefinition, PluginCommandContext } from "openclaw";

export async function createStatsCommand(): Promise<OpenClawPluginCommandDefinition> {
  return {
    name: "stats",
    description: "Show OmniLLM usage statistics",
    acceptsArgs: true,
    requireAuth: false,
    handler: async (ctx: PluginCommandContext) => {
      return { text: "Stats command - implement with manager.getStats()" };
    },
  };
}
