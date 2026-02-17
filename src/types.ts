/**
 * OmniLLM - Types
 *
 * Unified types for multi-provider LLM routing.
 */

import type { OpenClawPluginApi, ApiKeysConfig } from "./types/openclaw.js";

export type { ApiKeysConfig };

// ============================================
// Provider Types
// ============================================

export type LLMProvider = 
  | 'openrouter'
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'xai'
  | 'deepseek'
  | 'moonshot'
  | 'opencode'
  | 'azure'
  | 'anyscale'
  | 'together'
  | 'fireworks'
  | 'mistral'
  | 'cohere'
  | 'perplexity'
  | 'nvidia'
  | 'chutes';

export interface ProviderConfig {
  enabled: boolean;
  apiKey?: string;
  baseUrl?: string;
  models?: string[];
  priority?: number; // Higher = preferred when available
  capabilities?: ProviderCapabilities;
  [key: string]: unknown;
}

export interface ProviderCapabilities {
  streaming?: boolean;
  functionCalling?: boolean;
  vision?: boolean;
  reasoning?: boolean;
  maxTokens?: number;
  contextWindow?: number;
}

export interface ProvidersConfig {
  openrouter?: ProviderConfig;
  openai?: ProviderConfig;
  anthropic?: ProviderConfig;
  google?: ProviderConfig;
  xai?: ProviderConfig;
  deepseek?: ProviderConfig;
  moonshot?: ProviderConfig;
  opencode?: ProviderConfig;
  azure?: ProviderConfig;
  anyscale?: ProviderConfig;
  together?: ProviderConfig;
  fireworks?: ProviderConfig;
  mistral?: ProviderConfig;
  cohere?: ProviderConfig;
  perplexity?: ProviderConfig;
  nvidia?: ProviderConfig;
}

// ============================================
// Model Types
// ============================================

export interface ModelInfo {
  id: string;
  name: string;
  provider: LLMProvider;
  contextWindow: number;
  maxOutputTokens: number;
  capabilities: ProviderCapabilities;
  pricing?: {
    input: number;  // per 1M tokens
    output: number;
  };
}

export interface ModelAlias {
  alias: string;
  model: string;
  provider?: LLMProvider;
}

export interface ResolvedModel {
  modelId: string;
  provider: LLMProvider;
  capabilities: ProviderCapabilities;
}

// ============================================
// Raw API Response Types (for parsing provider responses)
// ============================================

/** OpenAI-compatible chat completion response from API */
export interface RawChatCompletionResponse {
  id?: string;
  model?: string;
  choices?: RawChoice[];
  usage?: RawUsage;
  created?: number;
  [key: string]: unknown;
}

/** Raw choice from API response */
export interface RawChoice {
  index?: number;
  message?: RawMessage;
  finish_reason?: string;
  delta?: RawDelta;
}

/** Raw message from API response */
export interface RawMessage {
  role?: string;
  content?: string;
  tool_calls?: RawToolCall[];
}

/** Raw delta for streaming */
export interface RawDelta {
  role?: string;
  content?: string;
  tool_calls?: RawToolCall[];
}

/** Raw tool call from API */
export interface RawToolCall {
  id?: string;
  type?: string;
  function?: {
    name?: string;
    arguments?: string;
  };
}

/** Raw usage from API response */
export interface RawUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

/** Raw streaming chunk from API */
export interface RawStreamChunk {
  id?: string;
  choices?: Array<{
    index?: number;
    delta?: RawDelta;
    finish_reason?: string;
  }>;
  [key: string]: unknown;
}

// ============================================
// Request/Response Types
// ============================================

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCalls?: ToolCall[] | RawToolCall[];
  toolCallId?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
  tools?: ToolDefinition[];
  toolChoice?: string | { type: 'function'; function: { name: string } };
  responseFormat?: { type: 'json_object' };
  reasoning?: { effort: 'low' | 'medium' | 'high' };
  // OpenAI-specific options
  presencePenalty?: number;
  frequencyPenalty?: number;
  logprobs?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  model: string;
  choices: Choice[];
  usage?: Usage;
  created: number;
}

export interface Choice {
  index: number;
  message: ChatMessage;
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter';
}

export interface Usage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface StreamChunk {
  id: string;
  choices: Array<{
    index: number;
    delta: Partial<ChatMessage>;
    finishReason?: string;
  }>;
}

// ============================================
// Routing Types
// ============================================

export type RoutingTier = 'simple' | 'medium' | 'complex' | 'reasoning' | 'vision';

export interface RoutingRule {
  id: string;
  name: string;
  enabled: boolean;
  tier?: RoutingTier;
  matchConditions?: MatchConditions;
  targetProvider?: LLMProvider;
  targetModel?: string;
}

export interface MatchConditions {
  minContextTokens?: number;
  requiresVision?: boolean;
  requiresReasoning?: boolean;
  requiresFunctionCalling?: boolean;
  maxTokens?: number;
  keywords?: string[];
  regex?: string;
}

export interface RoutingDecision {
  model: string;
  provider: LLMProvider;
  tier: RoutingTier;
  costEstimate: number;
  savings: number;
  reasoning: string;
  fallbackChain: LLMProvider[];
}

export interface RoutingConfig {
  defaultTier: RoutingTier;
  fallbackEnabled: boolean;
  maxCostPerRequest?: number;
  preferDirectOverOpenRouter: boolean;
  tierModels: Record<RoutingTier, TierModelConfig>;
}

export interface TierModelConfig {
  primary: string;
  fallback: string[];
}

// ============================================
// Events
// ============================================

export interface LLMEvent {
  type: 'request' | 'response' | 'error' | 'fallback';
  provider: LLMProvider;
  model: string;
  timestamp: number;
  duration?: number;
  tokens?: Usage;
  error?: string;
}

export type EventHandler = (event: LLMEvent) => void | Promise<void>;

// ============================================
// Stats
// ============================================

export interface ProviderStats {
  provider: LLMProvider;
  requests: number;
  promptTokens: number;
  completionTokens: number;
  totalCost: number;
  errors: number;
  avgLatency: number;
  lastActivity: number;
}

export interface AggregatedStats {
  totalRequests: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalCost: number;
  totalErrors: number;
  byProvider: ProviderStats[];
  savingsVsOpenRouter: number;
}
