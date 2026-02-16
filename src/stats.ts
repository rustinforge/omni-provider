/**
 * Stats Collector
 */

import type { LLMProvider, ProviderStats, AggregatedStats } from "../types.js";

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
