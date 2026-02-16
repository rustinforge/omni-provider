/**
 * OpenClaw Type Stubs
 * Minimal type definitions for OmniLLM
 */

export interface OpenClawPluginApi {
  registerCommand(command: OpenClawPluginCommandDefinition): void;
  registerProvider(provider: OpenClawProviderDefinition): void;
  getConfig(): OpenClawConfig;
  on(event: string, handler: Function): void;
  logger: {
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
    debug(message: string): void;
  };
  pluginConfig: Record<string, unknown>;
  registerService(service: { id: string; start: () => Promise<void>; stop: () => Promise<void> }): void;
}

export interface OpenClawPluginDefinition {
  id: string;
  name: string;
  description?: string;
  version: string;
  register(api: OpenClawPluginApi): void;
}

export interface OpenClawPluginCommandDefinition {
  name: string;
  description?: string;
  acceptsArgs?: boolean;
  requireAuth?: boolean;
  handler: (context: PluginCommandContext) => Promise<void>;
}

export interface PluginCommandContext {
  args: string[];
  message: {
    chat: { id: number | string };
    from: { id: number; first_name?: string; username?: string };
    text: string;
  };
  reply(text: string, options?: Record<string, unknown>): Promise<unknown>;
}

export interface OpenClawProviderDefinition {
  name: string;
  apiKey?: string;
  baseUrl?: string;
  models: string[];
}

export interface OpenClawConfig {
  providers?: Record<string, ProviderConfig>;
  apiKeys?: ApiKeysConfig;
  [key: string]: unknown;
}

export interface ProviderConfig {
  enabled?: boolean;
  apiKey?: string;
  baseUrl?: string;
  models?: string[];
  [key: string]: unknown;
}

export interface ApiKeysConfig {
  openrouter?: { apiKey?: string };
  openai?: { apiKey?: string };
  anthropic?: { apiKey?: string };
  google?: { apiKey?: string };
  xai?: { apiKey?: string };
  deepseek?: { apiKey?: string };
  moonshot?: { apiKey?: string };
  opencode?: { apiKey?: string };
  azure?: { apiKey?: string; endpoint?: string };
  anyscale?: { apiKey?: string };
  together?: { apiKey?: string };
  fireworks?: { apiKey?: string };
  mistral?: { apiKey?: string };
  cohere?: { apiKey?: string };
  perplexity?: { apiKey?: string };
  [key: string]: unknown;
}
