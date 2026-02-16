import type { OpenClawPluginCommandDefinition, PluginCommandContext } from "../types/openclaw.js";

export async function createStatsCommand(): Promise<OpenClawPluginCommandDefinition> {
  return {
    name: "stats",
    description: "Show OmniLLM usage statistics",
    acceptsArgs: true,
    requireAuth: false,
    handler: async (ctx: PluginCommandContext) => {
      await ctx.reply("Stats command - implement with manager.getStats()");
    },
  };
}
