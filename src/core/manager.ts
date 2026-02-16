/**
 * LLM Provider Manager
 * 
 * Centralized management for all LLM providers.
 * Handles initialization, routing, and request distribution.
 */

import type { OpenClawPluginApi } from "../types/openclaw.js";
import type {
  LLMProvider,
  ProvidersConfig,
  ProviderConfig,
  ApiKeysConfig,
  ChatCompletionRequest,
  ChatCompletionResponse,
  RoutingDecision,
  RoutingTier,
  ResolvedModel,
  ModelInfo,
  LLMEvent,
  EventHandler,
  AggregatedStats,
  ProviderStats,
} from "../types.js";
import { BaseLLMProvider } from "../providers/base";
import { OpenRouterProvider } from "../providers/openrouter";
import { OpenAIProvider } from "../providers/openai";
import { AnthropicProvider } from "../providers/anthropic";
import { GoogleProvider } from "../providers/google";
import { XAIProvider } from "../providers/xai";
import { DeepSeekProvider } from "../providers/deepseek";
import { MoonshotProvider } from "../providers/moonshot";
import { OpenCodeProvider } from "../providers/opencode";
import { AzureProvider } from "../providers/azure";
import { AnyscaleProvider } from "../providers/anyscale";
import { TogetherProvider } from "../providers/together";
import { FireworksProvider } from "../providers/fireworks";
import { MistralProvider } from "../providers/mistral";
import { CohereProvider } from "../providers/cohere";
import { PerplexityProvider } from "../providers/perplexity";
import { SmartRouter } from "../router/smart-router";
import { StatsCollector } from "../stats.js";
import { resolveModelAlias, getModel } from "../models.js";

const PROVIDER_CLASSES: Record<LLMProvider, new () => BaseLLMProvider> = {
  openrouter: OpenRouterProvider,
  openai: OpenAIProvider,
  anthropic: AnthropicProvider,
  google: GoogleProvider,
  xai: XAIProvider,
  deepseek: DeepSeekProvider,
  moonshot: MoonshotProvider,
  opencode: OpenCodeProvider,
  azure: AzureProvider,
  anyscale: AnyscaleProvider,
  together: TogetherProvider,
  fireworks: FireworksProvider,
  mistral: MistralProvider,
  cohere: CohereProvider,
  perplexity: PerplexityProvider,
};

export class LLMProviderManager {
  private api: OpenClawPluginApi;
  private config: ProvidersConfig;
  private apiKeys: ApiKeysConfig;
  private providers: Map<LLMProvider, BaseLLMProvider> = new Map();
  private eventHandlers: EventHandler[] = [];
  private router: SmartRouter;
  private stats: StatsCollector;
  private started = false;

  constructor(api: OpenClawPluginApi, config: ProvidersConfig, apiKeys: ApiKeysConfig) {
    this.api = api;
    this.config = config;
    this.apiKeys = apiKeys;
    this.router = new SmartRouter(this);
    this.stats = new StatsCollector();
  }

  /**
   * Register all enabled providers
   */
  async registerAll(): Promise<void> {
    const enabledProviders = Object.entries(this.config)
      .filter(([_, cfg]) => cfg.enabled)
      .map(([provider]) => provider as LLMProvider);

    for (const provider of enabledProviders) {
      await this.registerProvider(provider);
    }
  }

  /**
   * Register a single provider
   */
  async registerProvider(providerId: LLMProvider): Promise<void> {
    const providerConfig = this.config[providerId];
    if (!providerConfig?.enabled) {
      return;
    }

    const ProviderClass = PROVIDER_CLASSES[providerId];
    if (!ProviderClass) {
      throw new Error(`No provider implementation: ${providerId}`);
    }

    // Merge config with API keys
    const mergedConfig: Record<string, unknown> = {
      ...providerConfig,
      ...(this.apiKeys[providerId] || {}),
    };

    const provider = new ProviderClass();
    provider.provider = providerId;
    provider.name = providerId.toUpperCase();

    try {
      await provider.initialize(this.api, mergedConfig);
      this.providers.set(providerId, provider);
      this.api.logger.info(`OmniLLM: Registered ${providerId}`);
    } catch (err) {
      this.api.logger.error(`OmniLLM: Failed to init ${providerId}: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  }

  /**
   * Start all providers
   */
  async startAll(): Promise<void> {
    if (this.started) return;
    this.started = true;

    for (const [providerId, provider] of this.providers) {
      try {
        await provider.start();
        this.api.logger.info(`OmniLLM: Started ${providerId}`);
      } catch (err) {
        this.api.logger.error(`OmniLLM: Failed to start ${providerId}: ${err}`);
      }
    }
  }

  /**
   * Stop all providers
   */
  async stopAll(): Promise<void> {
    for (const [providerId, provider] of this.providers) {
      try {
        await provider.stop();
      } catch (err) {
        this.api.logger.error(`OmniLLM: Error stopping ${providerId}: ${err}`);
      }
    }
    this.started = false;
  }

  /**
   * Get provider instance
   */
  getProvider(providerId: LLMProvider): BaseLLMProvider | undefined {
    return this.providers.get(providerId);
  }

  /**
   * Get all registered providers
   */
  getAllProviders(): Map<LLMProvider, BaseLLMProvider> {
    return this.providers;
  }

  /**
   * Check if provider is available
   */
  isProviderAvailable(providerId: LLMProvider): boolean {
    return this.providers.has(providerId);
  }

  /**
   * Get enabled providers
   */
  getEnabledProviders(): LLMProvider[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Complete a chat completion request
   */
  async complete(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const startTime = Date.now();
    
    // Resolve model to provider
    const resolved = await this.resolveModel(request.model);
    const provider = this.providers.get(resolved.provider);
    
    if (!provider) {
      throw new Error(`Provider not available: ${resolved.provider}`);
    }

    try {
      // Update request with resolved model
      const providerRequest = { ...request, model: resolved.modelId };
      
      // Execute request
      const response = await provider.complete(providerRequest);
      
      // Record stats
      this.stats.recordRequest(
        resolved.provider,
        response.usage?.promptTokens || 0,
        response.usage?.completionTokens || 0,
        Date.now() - startTime
      );

      // Emit event
      this.emitEvent({
        type: 'response',
        provider: resolved.provider,
        model: resolved.modelId,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        tokens: response.usage,
      });

      return response;
    } catch (err) {
      // Try fallback
      const fallback = this.router.getFallback(resolved.provider, resolved.modelId);
      if (fallback.length > 0) {
        this.emitEvent({
          type: 'fallback',
          provider: resolved.provider,
          model: resolved.modelId,
          timestamp: Date.now(),
          error: err instanceof Error ? err.message : String(err),
        });
        
        // Retry with fallback
        for (const fbProvider of fallback) {
          const fbProviderInstance = this.providers.get(fbProvider);
          if (fbProviderInstance) {
            try {
              const response = await fbProviderInstance.complete({
                ...request,
                model: resolved.modelId, // Use same model ID if available
              });
              this.stats.recordRequest(fbProvider, response.usage?.promptTokens || 0, response.usage?.completionTokens || 0, Date.now() - startTime);
              return response;
            } catch { continue; }
          }
        }
      }
      
      throw err;
    }
  }

  /**
   * Resolve model to provider
   */
  async resolveModel(model: string): Promise<ResolvedModel> {
    // Handle "omni-llm/auto" routing
    if (model === 'omni-llm/auto' || model === 'auto') {
      return this.router.routeAuto();
    }

    // Handle aliases
    const resolvedModelId = resolveModelAlias(model);

    // Check if it's a known model
    const modelInfo = getModel(resolvedModelId);
    if (modelInfo) {
      return {
        modelId: resolvedModelId,
        provider: modelInfo.provider,
        capabilities: modelInfo.capabilities,
      };
    }

    // Try to infer provider from model ID prefix
    for (const [providerId, provider] of this.providers) {
      if (resolvedModelId.startsWith(providerId) || provider.supportsModel(resolvedModelId)) {
        return {
          modelId: resolvedModelId,
          provider: providerId,
          capabilities: {},
        };
      }
    }

    // Default to first available provider
    const firstProvider = this.getEnabledProviders()[0];
    if (!firstProvider) {
      throw new Error('No LLM providers configured');
    }

    return {
      modelId: resolvedModelId,
      provider: firstProvider,
      capabilities: {},
    };
  }

  /**
   * Route to best model based on request characteristics
   */
  async routeRequest(request: ChatCompletionRequest): Promise<RoutingDecision> {
    return this.router.decide(request);
  }

  /**
   * Register event handler
   */
  onEvent(handler: EventHandler): void {
    this.eventHandlers.push(handler);
  }

  /**
   * Emit event to handlers
   */
  private emitEvent(event: LLMEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (err) {
        this.api.logger.error(`OmniLLM: Event handler error: ${err}`);
      }
    }
  }

  /**
   * Get stats
   */
  getStats(): AggregatedStats {
    return this.stats.getAggregated();
  }
}
