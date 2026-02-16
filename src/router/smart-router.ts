/**
 * Smart Router
 * 
 * Intelligent routing based on request characteristics.
 */

import type { ChatCompletionRequest, LLMProvider, RoutingDecision, RoutingTier, ResolvedModel, ModelInfo } from "../types.js";
import { LLMProviderManager } from "../core/manager";
import { getModel } from "../models.js";

export class SmartRouter {
  private manager: LLMProviderManager;
  private defaultTier: RoutingTier = 'medium';

  private readonly TIER_CONFIG: Record<RoutingTier, { primary: string; fallback: string[] }> = {
    simple: { primary: 'gemini-2.5-flash', fallback: ['gpt-4o-mini', 'claude-haiku-4'] },
    medium: { primary: 'grok-3-fast', fallback: ['gpt-4o', 'claude-sonnet-4'] },
    complex: { primary: 'gemini-2.5-pro', fallback: ['claude-opus-4', 'gpt-4o'] },
    reasoning: { primary: 'o3-mini', fallback: ['grok-3-fast', 'deepseek-v3'] },
    vision: { primary: 'gpt-4o', fallback: ['claude-sonnet-4', 'gemini-2.5-pro'] },
  };

  constructor(manager: LLMProviderManager) {
    this.manager = manager;
  }

  /**
   * Route to best model for auto mode
   */
  async routeAuto(): Promise<ResolvedModel> {
    // Check for free providers first (OpenCode)
    if (this.manager.isProviderAvailable('opencode')) {
      return { modelId: 'big-pickle', provider: 'opencode', capabilities: {} };
    }

    // Try direct providers before OpenRouter
    const directProviders: LLMProvider[] = ['openai', 'anthropic', 'google', 'xai', 'deepseek'];
    for (const p of directProviders) {
      if (this.manager.isProviderAvailable(p)) {
        const model = this.TIER_CONFIG[this.defaultTier].primary;
        return { modelId: model, provider: p, capabilities: {} };
      }
    }

    // Fall back to OpenRouter
    if (this.manager.isProviderAvailable('openrouter')) {
      return { modelId: this.TIER_CONFIG[this.defaultTier].primary, provider: 'openrouter', capabilities: {} };
    }

    // Last resort - any available
    const available = this.manager.getEnabledProviders();
    if (available.length > 0) {
      return { modelId: 'gpt-4o', provider: available[0], capabilities: {} };
    }

    throw new Error('No LLM providers configured');
  }

  /**
   * Decide routing based on request
   */
  async decide(request: ChatCompletionRequest): Promise<RoutingDecision> {
    const tier = this.classifyRequest(request);
    const config = this.TIER_CONFIG[tier];

    const resolved = await this.routeAuto();
    
    return {
      model: resolved.modelId,
      provider: resolved.provider,
      tier,
      costEstimate: 0,
      savings: 0.5,
      reasoning: `Routed to ${resolved.provider} for ${tier} request`,
      fallbackChain: this.getFallback(resolved.provider, resolved.modelId),
    };
  }

  /**
   * Classify request into tier
   */
  private classifyRequest(request: ChatCompletionRequest): RoutingTier {
    const content = request.messages.map(m => m.content).join(' ').toLowerCase();
    
    // Check for reasoning keywords
    if (/prove|explain.*step|calculate|derive|logic|proof|theorem|math/i.test(content)) {
      return 'reasoning';
    }
    
    // Check for vision (has images in messages)
    if (request.messages.some(m => typeof m.content === 'object' && (m.content as any).some((p: any) => p.type === 'image_url'))) {
      return 'vision';
    }

    // Check complexity by length
    const totalLength = content.length;
    if (totalLength < 200) return 'simple';
    if (totalLength < 2000) return 'medium';
    return 'complex';
  }

  /**
   * Get fallback chain for a provider
   */
  getFallback(provider: LLMProvider, model: string): LLMProvider[] {
    const fallbacks: LLMProvider[] = [];
    const all = this.manager.getEnabledProviders();
    
    for (const p of all) {
      if (p !== provider) fallbacks.push(p);
    }
    
    return fallbacks;
  }
}
