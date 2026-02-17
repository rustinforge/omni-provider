/**
 * Stats Collector and Utilities
 */

import type { LLMProvider, ProviderStats, AggregatedStats } from "./types";

export interface DailyStats {
  date: string;
  requests: number;
  promptTokens: number;
  completionTokens: number;
  cost: number;
}

export class StatsCollector {
  private stats: Map<LLMProvider, ProviderStats> = new Map();

  recordRequest(provider: LLMProvider, promptTokens: number, completionTokens: number, latencyMs: number): void {
    let stat = this.stats.get(provider);
    if (!stat) {
      stat = { provider, requests: 0, promptTokens: 0, completionTokens: 0, totalCost: 0, errors: 0, avgLatency: 0, lastActivity: 0 };
      this.stats.set(provider, stat);
    }
    stat.requests++;
    stat.promptTokens += promptTokens;
    stat.completionTokens += completionTokens;
    stat.avgLatency = (stat.avgLatency * (stat.requests - 1) + latencyMs) / stat.requests;
    stat.lastActivity = Date.now();
  }

  recordError(provider: LLMProvider): void {
    const stat = this.stats.get(provider);
    if (stat) stat.errors++;
  }

  getAggregated(): AggregatedStats {
    let totalRequests = 0, totalPrompt = 0, totalCompletion = 0, totalCost = 0, totalErrors = 0;
    for (const stat of this.stats.values()) {
      totalRequests += stat.requests;
      totalPrompt += stat.promptTokens;
      totalCompletion += stat.completionTokens;
      totalErrors += stat.errors;
    }
    return { totalRequests, totalPromptTokens: totalPrompt, totalCompletionTokens: totalCompletion, totalCost, totalErrors, byProvider: Array.from(this.stats.values()), savingsVsOpenRouter: 0 };
  }
}

/**
 * Get stats for a time period
 */
export async function getStats(days: number): Promise<DailyStats[]> {
  // Placeholder implementation - in production this would read from logs
  return Array.from({ length: days }, (_, i) => ({
    date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    requests: 0,
    promptTokens: 0,
    completionTokens: 0,
    cost: 0,
  }));
}

/**
 * Format stats as ASCII table
 */
export function formatStatsAscii(stats: DailyStats[]): string {
  if (stats.length === 0) return "No stats available";
  
  const lines = [
    "OmniLLM Usage Statistics",
    "========================",
    "",
    "Date        | Requests | Tokens  | Cost",
    "------------|----------|---------|-------",
  ];
  
  for (const day of stats) {
    const tokens = day.promptTokens + day.completionTokens;
    lines.push(
      `${day.date} | ${day.requests.toString().padStart(8)} | ${tokens.toString().padStart(7)} | $${day.cost.toFixed(4)}`
    );
  }
  
  return lines.join("\n");
}
