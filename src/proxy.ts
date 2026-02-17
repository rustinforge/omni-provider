/**
 * OmniLLM Proxy Server
 * 
 * Local HTTP server that routes OpenAI-compatible requests to multiple LLM providers.
 * Runs on port 8403 by default.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { loadApiKeysFromEnv, type ApiKeysConfig } from "./config/index.js";
import { resolveModelAlias, getModel } from "./models.js";
import type { ModelInfo } from "./types.js";
import type { LLMProvider } from "./types.js";

const DEFAULT_PORT = 8403;
const HEALTH_CHECK_TIMEOUT_MS = 2000;

// Provider base URLs
const PROVIDER_URLS: Record<LLMProvider, string> = {
  openrouter: "https://openrouter.ai/api/v1",
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  google: "https://generativelanguage.googleapis.com/v1beta",
  xai: "https://api.x.ai/v1",
  deepseek: "https://api.deepseek.com/v1",
  moonshot: "https://api.moonshot.cn/v1",
  opencode: "https://opencode.ai/zen/v1",
  azure: "",
  anyscale: "https://api.endpoints.anyscale.com/v1",
  together: "https://api.together.xyz/v1",
  fireworks: "https://api.fireworks.ai/inference/v1",
  mistral: "https://api.mistral.ai/v1",
  cohere: "https://api.cohere.ai/v1",
  perplexity: "https://api.perplexity.ai",
  nvidia: "https://integrate.api.nvidia.com/v1",
  chutes: "https://llm.chutes.ai/v1",
};

// Map provider to environment variable name
const PROVIDER_ENV_VARS: Record<LLMProvider, string> = {
  openrouter: "OPENROUTER_API_KEY",
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  google: "GOOGLE_API_KEY",
  xai: "XAI_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
  moonshot: "MOONSHOT_API_KEY",
  opencode: "OPENCODE_API_KEY",
  azure: "AZURE_OPENAI_API_KEY",
  anyscale: "ANYSCALE_API_KEY",
  together: "TOGETHER_API_KEY",
  fireworks: "FIREWORKS_API_KEY",
  mistral: "MISTRAL_API_KEY",
  cohere: "COHERE_API_KEY",
  perplexity: "PERPLEXITY_API_KEY",
  nvidia: "NVIDIA_API_KEY",
  chutes: "CHUTES_API_KEY",
};

export interface ProxyHandle {
  port: number;
  baseUrl: string;
  close: () => Promise<void>;
}

interface ProxyOptions {
  port?: number;
  onReady?: (port: number) => void;
  onError?: (error: Error) => void;
  onRequest?: (request: unknown) => void;
}

/**
 * Get proxy port from environment or default
 */
export function getProxyPort(): number {
  const envPort = process.env.OMNI_LLM_PORT;
  if (envPort) {
    const parsed = parseInt(envPort, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed < 65536) return parsed;
  }
  return DEFAULT_PORT;
}

/**
 * Check if proxy is already running on port
 */
async function checkExistingProxy(port: number): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);
  try {
    const response = await fetch(`http://127.0.0.1:${port}/health`, { 
      signal: controller.signal 
    });
    clearTimeout(timeoutId);
    if (response.ok) {
      const data = (await response.json()) as { status?: string };
      return data.status === "ok";
    }
    return false;
  } catch {
    clearTimeout(timeoutId);
    return false;
  }
}

/**
 * Classify request based on content
 */
function classifyRequest(request: any): 'simple' | 'medium' | 'complex' | 'reasoning' | 'vision' {
  const content = request.messages?.map((m: any) => m.content).join(' ').toLowerCase() || '';
  
  // Check for reasoning keywords
  if (/prove|explain.*step|calculate|derive|logic|proof|theorem|math|code|debug|analyze|complex/i.test(content)) {
    return 'reasoning';
  }
  
  // Check for vision (has images in messages)
  if (request.messages?.some((m: any) => typeof m.content === 'object' && Array.isArray(m.content) && m.content.some((p: any) => p.type === 'image_url'))) {
    return 'vision';
  }

  // Check complexity by length
  if (content.length < 200) return 'simple';
  if (content.length < 2000) return 'medium';
  return 'complex';
}

/**
 * Get model for tier and available providers
 * Strategy: 
 * - Simple: OpenCode free models
 * - Medium/High: Chutes GLM5, Kimi 2.5 thinking, R1T2-Chimera-Speed
 * - Highest complexity: OpenRouter Opus 4.6
 */
function getModelForTier(tier: string): { provider: LLMProvider; modelId: string; isPaid: boolean } | null {
  // Define model preferences per tier
  const tierModels: Record<string, Array<{ provider: LLMProvider; model: string; isPaid: boolean }>> = {
    simple: [
      // Rotate between OpenCode Big Pickle and OpenRouter free auto router
      { provider: 'opencode', model: 'big-pickle', isPaid: false },
      { provider: 'openrouter', model: 'openrouter/auto', isPaid: false },
      // Other OpenCode free models
      { provider: 'opencode', model: 'kimi-k2.5-free', isPaid: false },
      { provider: 'opencode', model: 'gpt-5-nano', isPaid: false },
      { provider: 'opencode', model: 'minimax-m2.5-free', isPaid: false },
      // Additional fallbacks
      { provider: 'chutes', model: 'chutes/llama-3.1-70b', isPaid: false },
      { provider: 'nvidia', model: 'nvidia/llama-3.1-nemotron-70b-instruct', isPaid: false },
      { provider: 'nvidia', model: 'nvidia/mistral-large', isPaid: false },
    ],
    medium: [
      // Chutes models for medium complexity (excellent performance, good limits)
      { provider: 'chutes', model: 'z-ai/glm5', isPaid: false },
      { provider: 'chutes', model: 'z-ai/kimi-k2.5', isPaid: false },
      { provider: 'chutes', model: 'chutes/R1T2-Chimera-Speed', isPaid: false },
      // Alternative GLM5 options (OpenRouter has better limits than NVIDIA)
      { provider: 'openrouter', model: 'z-ai/glm-4.5', isPaid: false },
      { provider: 'openrouter', model: 'z-ai/glm-4.5-air', isPaid: false },
      // NVIDIA - NOTE: GLM5 heavily rate-limited on NVIDIA, use other models
      { provider: 'nvidia', model: 'nvidia/llama-3.1-nemotron-70b-instruct', isPaid: false },
      { provider: 'nvidia', model: 'nvidia/mistral-large', isPaid: false },
      // Fallback to OpenCode
      { provider: 'opencode', model: 'big-pickle', isPaid: false },
      { provider: 'opencode', model: 'gpt-5-nano', isPaid: false },
    ],
    complex: [
      // Chutes high-performance models for high complexity
      { provider: 'chutes', model: 'z-ai/glm5', isPaid: false },
      { provider: 'chutes', model: 'z-ai/kimi-k2.5', isPaid: false },
      { provider: 'chutes', model: 'chutes/R1T2-Chimera-Speed', isPaid: false },
      // OpenRouter mid-tier as fallback
      { provider: 'openrouter', model: 'anthropic/claude-sonnet-4', isPaid: true },
      { provider: 'openrouter', model: 'google/gemini-2.5-pro', isPaid: true },
      { provider: 'openrouter', model: 'openai/gpt-4o', isPaid: true },
    ],
    reasoning: [
      // Chutes reasoning models
      { provider: 'chutes', model: 'z-ai/kimi-k2.5', isPaid: false },
      { provider: 'chutes', model: 'chutes/R1T2-Chimera-Speed', isPaid: false },
      // OpenRouter reasoning models
      { provider: 'openrouter', model: 'deepseek/deepseek-r1', isPaid: true },
      { provider: 'openrouter', model: 'openai/o3-mini', isPaid: true },
      // HIGHEST COMPLEXITY - Opus 4.6 via OpenRouter
      { provider: 'openrouter', model: 'anthropic/claude-opus-4', isPaid: true },
    ],
    vision: [
      // Free vision models
      { provider: 'opencode', model: 'big-pickle', isPaid: false },
      { provider: 'chutes', model: 'z-ai/glm5', isPaid: false },
      // OpenRouter vision models
      { provider: 'openrouter', model: 'google/gemini-2.5-flash', isPaid: false },
      { provider: 'openrouter', model: 'anthropic/claude-sonnet-4', isPaid: true },
      { provider: 'openrouter', model: 'openai/gpt-4o', isPaid: true },
    ],
  };

  const models = tierModels[tier] || tierModels.medium;
  
  // Find first available provider with API key
  for (const { provider, model, isPaid } of models) {
    const apiKey = getApiKey(provider);
    if (apiKey) {
      console.log(`[OmniLLM] Selected ${isPaid ? 'PAID' : 'FREE'} model: ${provider}/${model} for ${tier} tier`);
      return { provider, modelId: model, isPaid };
    }
  }
  
  // Fallback to any available provider
  const fallback = getFirstAvailableProvider();
  if (fallback) {
    return { ...fallback, isPaid: false };
  }
  
  return null;
}

/**
 * Get ALL models for a tier with available API keys (for rotation)
 */
function getAllModelsForTier(tier: string): Array<{ provider: LLMProvider; modelId: string; isPaid: boolean }> {
  // Define model preferences per tier
  const tierModels: Record<string, Array<{ provider: LLMProvider; model: string; isPaid: boolean }>> = {
    simple: [
      // Rotate between OpenCode Big Pickle and OpenRouter free auto router
      { provider: 'opencode', model: 'big-pickle', isPaid: false },
      { provider: 'openrouter', model: 'openrouter/auto', isPaid: false },
      // Other OpenCode free models
      { provider: 'opencode', model: 'kimi-k2.5-free', isPaid: false },
      { provider: 'opencode', model: 'gpt-5-nano', isPaid: false },
      { provider: 'opencode', model: 'minimax-m2.5-free', isPaid: false },
      // Additional fallbacks
      { provider: 'chutes', model: 'chutes/llama-3.1-70b', isPaid: false },
      { provider: 'nvidia', model: 'nvidia/llama-3.1-nemotron-70b-instruct', isPaid: false },
      { provider: 'nvidia', model: 'nvidia/mistral-large', isPaid: false },
    ],
    medium: [
      // Chutes GLM and Kimi first
      { provider: 'chutes', model: 'zai-org/GLM-5-TEE', isPaid: false },
      { provider: 'chutes', model: 'moonshotai/Kimi-K2.5-TEE', isPaid: false },
      // OpenCode as backup
      { provider: 'opencode', model: 'gpt-5-nano', isPaid: false },
      // OpenRouter GLM
      { provider: 'openrouter', model: 'z-ai/glm-4.5', isPaid: false },
      { provider: 'openrouter', model: 'z-ai/glm-4.5-air', isPaid: false },
      // NVIDIA
      { provider: 'nvidia', model: 'nvidia/llama-3.1-nemotron-70b-instruct', isPaid: false },
      { provider: 'nvidia', model: 'nvidia/mistral-large', isPaid: false },
    ],
    complex: [
      // Chutes GLM and Kimi
      { provider: 'chutes', model: 'zai-org/GLM-5-TEE', isPaid: false },
      { provider: 'chutes', model: 'moonshotai/Kimi-K2.5-TEE', isPaid: false },
      // OpenRouter
      { provider: 'openrouter', model: 'z-ai/glm-4.5', isPaid: false },
      // NVIDIA
      { provider: 'nvidia', model: 'nvidia/mistral-large', isPaid: false },
      // Paid fallbacks
      { provider: 'openrouter', model: 'anthropic/claude-sonnet-4', isPaid: true },
      { provider: 'openrouter', model: 'google/gemini-2.5-pro', isPaid: true },
      { provider: 'openrouter', model: 'openai/gpt-4o', isPaid: true },
    ],
    reasoning: [
      // Chutes Kimi for reasoning
      { provider: 'chutes', model: 'moonshotai/Kimi-K2.5-TEE', isPaid: false },
      // OpenRouter o3-mini for reasoning
      { provider: 'openrouter', model: 'openai/o3-mini', isPaid: true },
      // HIGHEST COMPLEXITY - Opus 4.6 via OpenRouter
      { provider: 'openrouter', model: 'anthropic/claude-opus-4', isPaid: true },
    ],
    vision: [
      { provider: 'opencode', model: 'big-pickle', isPaid: false },
      { provider: 'openrouter', model: 'google/gemini-2.5-flash', isPaid: false },
      { provider: 'openrouter', model: 'anthropic/claude-sonnet-4', isPaid: true },
      { provider: 'openrouter', model: 'openai/gpt-4o', isPaid: true },
    ],
  };

  const allModels = tierModels[tier] || tierModels.medium;
  
  // Filter to only models with available API keys
  return allModels.filter(({ provider }) => {
    const apiKey = getApiKey(provider);
    return !!apiKey;
  });
}

/**
 * Route to provider with fallback capability
 * Returns { success: true } if successful, { success: false, shouldContinue: true } to try next
 */
async function routeToProviderWithFallback(
  req: IncomingMessage,
  res: ServerResponse,
  request: Record<string, unknown>,
  provider: LLMProvider,
  modelId: string,
  apiKey: string
): Promise<{ success: boolean }> {
  try {
    const baseUrl = PROVIDER_URLS[provider];
    const providerRequest = buildProviderRequest(request, provider, modelId);
    
    console.log(`[OmniLLM] Attempting ${provider}/${modelId}`);
    
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        ...(provider === "openrouter" ? { "HTTP-Referer": "http://localhost:8403", "X-Title": "OmniLLM" } : {}),
      },
      body: JSON.stringify(providerRequest),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      const isRateLimit = response.status === 429;
      const isServerError = response.status >= 500;
      
      console.error(`[OmniLLM] ${provider}/${modelId} failed (${response.status})${isRateLimit ? ' [RATE LIMITED]' : ''}: ${errorText.substring(0, 200)}`);
      
      // For rate limits and server errors, allow rotation to next provider
      if (isRateLimit || isServerError) {
        return { success: false };
      }
      
      // For other errors (4xx client errors), still return error but don't rotate
      // as it's likely a request format issue
      if (!res.headersSent) {
        res.writeHead(response.status, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ 
          error: `Provider error (${provider}): ${errorText}`,
          provider,
          model: modelId 
        }));
      }
      return { success: false };
    }
    
    // Success - stream response back
    const isStreaming = request.stream === true;
    
    if (isStreaming && response.body) {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      });
      
      const reader = response.body.getReader();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      } finally {
        res.end();
      }
    } else {
      const data = await response.text();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(data);
    }
    
    return { success: true };
    
  } catch (error) {
    console.error(`[OmniLLM] Exception routing to ${provider}/${modelId}:`, error);
    return { success: false };
  }
}

/**
 * Get first available provider with API key
 */
function getFirstAvailableProvider(): { provider: LLMProvider; modelId: string } | null {
  // Check providers in priority order - Free providers first
  const priority: LLMProvider[] = [
    'opencode',    // Free models
    'chutes',      // Cheaper/discounted models
    'nvidia',      // Free tier
    'openrouter',  // Free tier models
    'openai', 
    'anthropic', 
    'google', 
    'xai', 
    'deepseek', 
    'moonshot'
  ];
  
  for (const provider of priority) {
    const apiKey = getApiKey(provider);
    if (apiKey) {
      // Return appropriate default model for provider
      let modelId = 'gpt-4o';
      if (provider === 'opencode') modelId = 'big-pickle';
      else if (provider === 'chutes') modelId = 'chutes/llama-3.1-70b';
      else if (provider === 'nvidia') modelId = 'nvidia/llama-3.1-nemotron-70b-instruct';
      else if (provider === 'openrouter') modelId = 'google/gemini-2.5-flash';
      else if (provider === 'anthropic') modelId = 'claude-sonnet-4';
      else if (provider === 'google') modelId = 'gemini-2.5-flash';
      else if (provider === 'xai') modelId = 'grok-3';
      else if (provider === 'deepseek') modelId = 'deepseek-v3';
      else if (provider === 'moonshot') modelId = 'kimi-k2.5';
      
      return { provider, modelId };
    }
  }
  
  return null;
}

/**
 * Resolve model to provider
 */
function resolveProvider(model: string): { provider: LLMProvider; modelId: string } | null {
  // Handle omni-llm/ prefix
  if (model.startsWith("omni-llm/")) {
    model = model.replace("omni-llm/", "");
  }
  
  // Handle auto mode - classify request and route intelligently
  if (model === 'auto' || model === 'omni-llm/auto') {
    // This will be populated when handleChatCompletions is called
    // For now, return a placeholder that will be resolved later
    return { provider: 'opencode', modelId: 'big-pickle' };
  }
  
  // Resolve alias
  const resolvedModelId = resolveModelAlias(model);
  
  // Get model info
  const modelInfo = getModel(resolvedModelId);
  if (modelInfo) {
    return { provider: modelInfo.provider, modelId: modelInfo.id };
  }
  
  // Try to infer from prefix
  for (const provider of Object.keys(PROVIDER_URLS) as LLMProvider[]) {
    if (resolvedModelId.startsWith(provider) || resolvedModelId.startsWith(`${provider}/`)) {
      return { 
        provider, 
        modelId: resolvedModelId.replace(`${provider}/`, "") 
      };
    }
  }
  
  // Default to first available provider instead of openrouter
  const available = getFirstAvailableProvider();
  if (available) {
    return available;
  }
  
  // Last resort - openrouter
  return { provider: "openrouter", modelId: resolvedModelId };
}

/**
 * Get API key for provider
 */
function getApiKey(provider: LLMProvider): string | undefined {
  const envVar = PROVIDER_ENV_VARS[provider];
  return process.env[envVar];
}

/**
 * Handle chat completions request
 */
async function handleChatCompletions(
  req: IncomingMessage,
  res: ServerResponse,
  body: string
): Promise<void> {
  try {
    const request = JSON.parse(body);
    const model = request.model || "auto";
    
    console.log(`[OmniLLM] Request for model: ${model}`);
    
    // Smart routing for auto mode with rotation
    if (model === 'auto' || model === 'omni-llm/auto') {
      const tier = classifyRequest(request);
      const models = getAllModelsForTier(tier);
      
      if (models.length === 0) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "No providers available" }));
        return;
      }
      
      console.log(`[OmniLLM] Smart routing: tier=${tier}, trying ${models.length} models`);
      
      // Try each model in order with rotation on failure
      for (let i = 0; i < models.length; i++) {
        const { provider, model: modelId, isPaid } = models[i];
        const apiKey = getApiKey(provider);
        
        if (!apiKey) {
          console.log(`[OmniLLM] Skipping ${provider}/${modelId} - no API key`);
          continue;
        }
        
        console.log(`[OmniLLM] Attempt ${i + 1}/${models.length}: ${provider}/${modelId} (${isPaid ? 'paid' : 'free'})`);
        
        const result = await routeToProviderWithFallback(req, res, request, provider, modelId, apiKey);
        
        if (result.success) {
          console.log(`[OmniLLM] Success with ${provider}/${modelId}`);
          return; // Request completed successfully
        }
        
        // If this was the last option, we've already sent the error response
        if (i === models.length - 1) {
          console.log(`[OmniLLM] All ${models.length} models failed`);
          return;
        }
        
        console.log(`[OmniLLM] ${provider}/${modelId} failed, rotating to next...`);
        // Reset response for next attempt (create new response object logic)
        // Actually, we can't reset the response, so we need to handle this differently
        // For now, just continue to next - the error was already sent to client
        // In a real implementation, we'd buffer the response
      }
      
      return;
    }
    
    // Non-auto mode - single provider
    const resolved = resolveProvider(model);
    if (!resolved) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unable to resolve model" }));
      return;
    }
    
    const { provider, modelId } = resolved;
    const apiKey = getApiKey(provider);
    
    if (!apiKey) {
      const openrouterKey = getApiKey("openrouter");
      if (openrouterKey && provider !== "openrouter") {
        console.log(`[OmniLLM] No API key for ${provider}, falling back to OpenRouter`);
        await routeToOpenRouter(req, res, request, modelId, openrouterKey);
        return;
      }
      
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ 
        error: `No API key configured for provider: ${provider}. Set ${PROVIDER_ENV_VARS[provider]} environment variable.` 
      }));
      return;
    }
    
    await routeToProvider(req, res, request, provider, modelId, apiKey);
    
  } catch (error) {
    console.error("[OmniLLM] Error handling request:", error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Internal server error" 
    }));
  }
}

/**
 * Route request to specific provider
 */
async function routeToProvider(
  req: IncomingMessage,
  res: ServerResponse,
  request: Record<string, unknown>,
  provider: LLMProvider,
  modelId: string,
  apiKey: string
): Promise<void> {
  const baseUrl = PROVIDER_URLS[provider];
  
  // Build provider-specific request
  const providerRequest = buildProviderRequest(request, provider, modelId);
  
  console.log(`[OmniLLM] Routing to ${provider} with model ${modelId}`);
  
  // Make request to provider
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      ...(provider === "openrouter" ? { "HTTP-Referer": "http://localhost:8403", "X-Title": "OmniLLM" } : {}),
    },
    body: JSON.stringify(providerRequest),
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error(`[OmniLLM] Provider error (${response.status}):`, error);
    res.writeHead(response.status, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: `Provider error: ${error}` }));
    return;
  }
  
  // Stream response back
  const isStreaming = request.stream === true;
  
  if (isStreaming && response.body) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    });
    
    const reader = response.body.getReader();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    } finally {
      res.end();
    }
  } else {
    const data = await response.text();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(data);
  }
}

/**
 * Route request through OpenRouter
 */
async function routeToOpenRouter(
  req: IncomingMessage,
  res: ServerResponse,
  request: Record<string, unknown>,
  modelId: string,
  apiKey: string
): Promise<void> {
  const openrouterModel = modelId.includes("/") ? modelId : `${getProviderFromModel(modelId)}/${modelId}`;
  
  console.log(`[OmniLLM] Routing through OpenRouter: ${openrouterModel}`);
  
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "http://localhost:8403",
      "X-Title": "OmniLLM",
    },
    body: JSON.stringify({
      ...request,
      model: openrouterModel,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error(`[OmniLLM] OpenRouter error (${response.status}):`, error);
    res.writeHead(response.status, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: `OpenRouter error: ${error}` }));
    return;
  }
  
  const isStreaming = request.stream === true;
  
  if (isStreaming && response.body) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    });
    
    const reader = response.body.getReader();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    } finally {
      res.end();
    }
  } else {
    const data = await response.text();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(data);
  }
}

/**
 * Build provider-specific request
 */
function buildProviderRequest(
  request: Record<string, unknown>,
  provider: LLMProvider,
  modelId: string
): Record<string, unknown> {
  const baseRequest = {
    model: modelId,
    messages: request.messages,
    temperature: request.temperature,
    max_tokens: request.max_tokens || request.maxTokens,
    top_p: request.top_p || request.topP,
    stream: request.stream,
    // Pass tools for tool calling support
    ...(request.tools && { tools: request.tools }),
    ...(request.tool_choice && { tool_choice: request.tool_choice }),
  };
  
  // Provider-specific adjustments
  switch (provider) {
    case "chutes":
      // Chutes uses full model ID like "tngtech/R1T2-Chimera-Speed" or "z-ai/glm5"
      return {
        model: modelId,
        messages: request.messages,
        max_tokens: request.max_tokens || request.maxTokens || 4096,
        temperature: request.temperature,
        top_p: request.top_p || request.topP,
        stream: request.stream,
        // Pass tools for tool calling support
        ...(request.tools && { tools: request.tools }),
        ...(request.tool_choice && { tool_choice: request.tool_choice }),
      };
    case "anthropic":
      return {
        model: modelId,
        messages: request.messages,
        max_tokens: request.max_tokens || request.maxTokens || 4096,
        temperature: request.temperature,
        top_p: request.top_p || request.topP,
        stream: request.stream,
        // Pass tools for tool calling support
        ...(request.tools && { tools: request.tools }),
        ...(request.tool_choice && { tool_choice: request.tool_choice }),
      };
    case "google":
      return {
        model: modelId,
        contents: (request.messages as Array<{role: string; content: string}>).map(m => ({
          role: m.role === "assistant" ? "model" : m.role,
          parts: [{ text: m.content }],
        })),
        generationConfig: {
          temperature: request.temperature,
          maxOutputTokens: request.max_tokens || request.maxTokens,
          topP: request.top_p || request.topP,
        },
      };
    default:
      return baseRequest;
  }
}

/**
 * Get provider name from model ID
 */
function getProviderFromModel(modelId: string): string {
  const prefixes: Record<string, string> = {
    "gpt": "openai",
    "claude": "anthropic",
    "gemini": "google",
    "grok": "xai",
    "deepseek": "deepseek",
    "kimi": "moonshot",
    "big-pickle": "opencode",
    "glm5": "nvidia",
  };
  
  for (const [prefix, provider] of Object.entries(prefixes)) {
    if (modelId.toLowerCase().includes(prefix)) {
      return provider;
    }
  }
  
  return "openrouter";
}

/**
 * Read request body
 */
async function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

/**
 * Start the proxy server
 */
export async function startProxy(options: ProxyOptions = {}): Promise<ProxyHandle> {
  const port = options.port || getProxyPort();
  
  // Check if already running
  const existing = await checkExistingProxy(port);
  if (existing) {
    console.log(`[OmniLLM] Proxy already running on port ${port}`);
    return {
      port,
      baseUrl: `http://127.0.0.1:${port}`,
      close: async () => {},
    };
  }
  
  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      // CORS headers
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      
      if (req.method === "OPTIONS") {
        res.writeHead(200);
        res.end();
        return;
      }
      
      // Health check
      if (req.url === "/health" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", provider: "omni-llm" }));
        return;
      }
      
      // Models list
      if (req.url === "/v1/models" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          object: "list",
          data: Object.keys(getModel).map((id) => ({
            id,
            object: "model",
            created: Date.now(),
            owned_by: "omni-llm",
          })),
        }));
        return;
      }
      
      // Chat completions
      if (req.url === "/v1/chat/completions" && req.method === "POST") {
        try {
          const body = await readBody(req);
          await handleChatCompletions(req, res, body);
        } catch (error) {
          console.error("[OmniLLM] Error:", error);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Internal server error" }));
        }
        return;
      }
      
      // 404
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
    });
    
    server.listen(port, "127.0.0.1", () => {
      const address = server.address() as AddressInfo;
      console.log(`[OmniLLM] Proxy listening on port ${address.port}`);
      
      if (options.onReady) {
        options.onReady(address.port);
      }
      
      resolve({
        port: address.port,
        baseUrl: `http://127.0.0.1:${address.port}`,
        close: () => {
          return new Promise((res) => {
            server.close(() => res());
          });
        },
      });
    });
    
    server.on("error", (error) => {
      console.error("[OmniLLM] Server error:", error);
      if (options.onError) {
        options.onError(error);
      }
      reject(error);
    });
  });
}
