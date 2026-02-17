/**
 * Commands - Stats
 * 
 * Show OmniLLM usage statistics
 */

import type { OpenClawPluginCommandDefinition, PluginCommandContext, PluginCommandResult } from "../types/openclaw.js";

export async function createStatsCommand(): Promise<OpenClawPluginCommandDefinition> {
  return {
    name: "stats",
    description: "Show OmniLLM usage statistics",
    acceptsArgs: true,
    requireAuth: false,
    handler: async (ctx: PluginCommandContext): Promise<PluginCommandResult> => {
      return { text: "Stats command - implement with actual data collection" };
    },
  };
}
