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
 * Resolve model to provider
 */
function resolveProvider(model: string): { provider: LLMProvider; modelId: string } | null {
  // Handle omni-llm/ prefix
  if (model.startsWith("omni-llm/")) {
    model = model.replace("omni-llm/", "");
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
  
  // Default to openrouter
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
    
    // Resolve model to provider
    const resolved = resolveProvider(model);
    if (!resolved) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unable to resolve model" }));
      return;
    }
    
    const { provider, modelId } = resolved;
    const apiKey = getApiKey(provider);
    
    if (!apiKey) {
      // Try fallback to openrouter
      const openrouterKey = getApiKey("openrouter");
      if (openrouterKey && provider !== "openrouter") {
        console.log(`[OmniLLM] No API key for ${provider}, falling back to OpenRouter`);
        return routeToOpenRouter(req, res, request, modelId, openrouterKey);
      }
      
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ 
        error: `No API key configured for provider: ${provider}. Set ${PROVIDER_ENV_VARS[provider]} environment variable.` 
      }));
      return;
    }
    
    // Route to provider
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
  };
  
  // Provider-specific adjustments
  switch (provider) {
    case "anthropic":
      return {
        model: modelId,
        messages: request.messages,
        max_tokens: request.max_tokens || request.maxTokens || 4096,
        temperature: request.temperature,
        top_p: request.top_p || request.topP,
        stream: request.stream,
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
