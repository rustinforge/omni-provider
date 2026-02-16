/**
 * OmniLLM - Types
 * 
 * Unified types for multi-provider LLM routing.
 */

import type { OpenClawPluginApi } from "openclaw";

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
  | 'perplexity';

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
// Request/Response Types
// ============================================

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCalls?: ToolCall[];
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
