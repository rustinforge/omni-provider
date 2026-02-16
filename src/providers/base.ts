/**
 * Base LLM Provider
 * 
 * Abstract base class for all LLM providers.
 */

import type { OpenClawPluginApi } from "openclaw";
import type {
  LLMProvider,
  ProviderConfig,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ProviderCapabilities,
} from "../types.js";

export abstract class BaseLLMProvider {
  provider: LLMProvider = 'openrouter';
  name: string = 'BaseLLMProvider';
  protected api!: OpenClawPluginApi;
  protected config!: ProviderConfig;
  protected initialized = false;
  protected running = false;

  /**
   * Initialize the provider
   */
  async initialize(api: OpenClawPluginApi, config: ProviderConfig): Promise<void> {
    this.api = api;
    this.config = config;
    this.initialized = true;
  }

  /**
   * Start the provider
   */
  async start(): Promise<void> {
    this.ensureInitialized();
    this.running = true;
  }

  /**
   * Stop the provider
   */
  async stop(): Promise<void> {
    this.running = false;
  }

  /**
   * Complete a chat completion request
   */
  abstract complete(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;

  /**
   * Stream a chat completion request
   */
  async *stream(request: ChatCompletionRequest): AsyncGenerator<any> {
    throw new Error(`${this.name}: Streaming not implemented`);
  }

  /**
   * Check if provider supports a specific model
   */
  supportsModel(modelId: string): boolean {
    return this.config.models?.includes(modelId) || false;
  }

  /**
   * Get provider capabilities
   */
  getCapabilities(): ProviderCapabilities {
    return this.config.capabilities || {};
  }

  /**
   * Get base URL for API calls
   */
  protected getBaseUrl(): string {
    return this.config.baseUrl || this.getDefaultBaseUrl();
  }

  /**
   * Get default base URL (override in subclasses)
   */
  protected getDefaultBaseUrl(): string {
    return 'https://api.openrouter.ai/v1';
  }

  /**
   * Get API key
   */
  protected getApiKey(): string {
    return this.config.apiKey || '';
  }

  /**
   * Ensure provider is initialized
   */
  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(`${this.name}: Not initialized`);
    }
  }

  /**
   * Generate request ID
   */
  protected generateId(): string {
    return `chatcmpl-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
