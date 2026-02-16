// src/version.ts
var VERSION = "1.0.0";

// src/providers/base.ts
var BaseLLMProvider = class {
  provider = "openrouter";
  name = "BaseLLMProvider";
  api;
  config;
  initialized = false;
  running = false;
  /**
   * Initialize the provider
   */
  async initialize(api, config) {
    this.api = api;
    this.config = config;
    this.initialized = true;
  }
  /**
   * Start the provider
   */
  async start() {
    this.ensureInitialized();
    this.running = true;
  }
  /**
   * Stop the provider
   */
  async stop() {
    this.running = false;
  }
  /**
   * Stream a chat completion request
   */
  async *stream(request) {
    throw new Error(`${this.name}: Streaming not implemented`);
  }
  /**
   * Check if provider supports a specific model
   */
  supportsModel(modelId) {
    return this.config.models?.includes(modelId) || false;
  }
  /**
   * Get provider capabilities
   */
  getCapabilities() {
    return this.config.capabilities || {};
  }
  /**
   * Get base URL for API calls
   */
  getBaseUrl() {
    return this.config.baseUrl || this.getDefaultBaseUrl();
  }
  /**
   * Get default base URL (override in subclasses)
   */
  getDefaultBaseUrl() {
    return "https://api.openrouter.ai/v1";
  }
  /**
   * Get API key
   */
  getApiKey() {
    return this.config.apiKey || "";
  }
  /**
   * Ensure provider is initialized
   */
  ensureInitialized() {
    if (!this.initialized) {
      throw new Error(`${this.name}: Not initialized`);
    }
  }
  /**
   * Generate request ID
   */
  generateId() {
    return `chatcmpl-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
};

// src/providers/openrouter.ts
var OpenRouterProvider = class extends BaseLLMProvider {
  baseUrl = "https://openrouter.ai/api/v1";
  constructor() {
    super();
    this.provider = "openrouter";
    this.name = "OpenRouter";
  }
  getDefaultBaseUrl() {
    return this.baseUrl;
  }
  async complete(request) {
    this.ensureInitialized();
    const body = {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      top_p: request.topP,
      stream: false
    };
    if (request.tools) {
      body.tools = request.tools;
    }
    if (request.responseFormat) {
      body.response_format = request.responseFormat;
    }
    const response = await fetch(`${this.getBaseUrl()}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.getApiKey()}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://openclaw.ai",
        "X-Title": "OpenClaw"
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`OpenRouter API error: ${error.error?.message || response.statusText}`);
    }
    const data = await response.json();
    return {
      id: data.id || this.generateId(),
      model: data.model || request.model,
      choices: data.choices?.map((c) => ({
        index: c.index || 0,
        message: {
          role: c.message?.role || "assistant",
          content: c.message?.content || "",
          toolCalls: c.message?.tool_calls
        },
        finishReason: c.finish_reason || "stop"
      })) || [],
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens || 0,
        completionTokens: data.usage.completion_tokens || 0,
        totalTokens: data.usage.total_tokens || 0
      } : void 0,
      created: data.created || Date.now()
    };
  }
  async *stream(request) {
    this.ensureInitialized();
    const body = {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      stream: true
    };
    const response = await fetch(`${this.getBaseUrl()}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.getApiKey()}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://openclaw.ai",
        "X-Title": "OpenClaw"
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        if (trimmed === "data: [DONE]") return;
        try {
          const data = JSON.parse(trimmed.slice(6));
          yield {
            id: data.id,
            choices: [{
              index: 0,
              delta: data.choices?.[0]?.delta || {},
              finishReason: data.choices?.[0]?.finish_reason
            }]
          };
        } catch {
        }
      }
    }
  }
};

// src/providers/openai.ts
var OpenAIProvider = class extends BaseLLMProvider {
  baseUrl = "https://api.openai.com/v1";
  constructor() {
    super();
    this.provider = "openai";
    this.name = "OpenAI";
  }
  getDefaultBaseUrl() {
    return this.baseUrl;
  }
  async complete(request) {
    this.ensureInitialized();
    const body = {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      top_p: request.topP,
      stream: false
    };
    if (request.tools) body.tools = request.tools;
    if (request.toolChoice) body.tool_choice = request.toolChoice;
    if (request.responseFormat) body.response_format = request.responseFormat;
    if (request.reasoning) body.reasoning_effort = request.reasoning.effort;
    const response = await fetch(`${this.getBaseUrl()}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.getApiKey()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }
    const data = await response.json();
    return {
      id: data.id || this.generateId(),
      model: data.model || request.model,
      choices: data.choices?.map((c) => ({
        index: c.index || 0,
        message: {
          role: c.message?.role || "assistant",
          content: c.message?.content || "",
          toolCalls: c.message?.tool_calls
        },
        finishReason: c.finish_reason || "stop"
      })) || [],
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens || 0,
        completionTokens: data.usage.completion_tokens || 0,
        totalTokens: data.usage.total_tokens || 0
      } : void 0,
      created: data.created || Date.now()
    };
  }
  async *stream(request) {
    this.ensureInitialized();
    const body = {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      stream: true
    };
    const response = await fetch(`${this.getBaseUrl()}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.getApiKey()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        if (trimmed === "data: [DONE]") return;
        try {
          const data = JSON.parse(trimmed.slice(6));
          yield {
            id: data.id,
            choices: [{
              index: 0,
              delta: data.choices?.[0]?.delta || {},
              finishReason: data.choices?.[0]?.finish_reason
            }]
          };
        } catch {
        }
      }
    }
  }
};

// src/providers/anthropic.ts
var AnthropicProvider = class extends BaseLLMProvider {
  baseUrl = "https://api.anthropic.com/v1";
  constructor() {
    super();
    this.provider = "anthropic";
    this.name = "Anthropic";
  }
  getDefaultBaseUrl() {
    return this.baseUrl;
  }
  async complete(request) {
    this.ensureInitialized();
    const systemMessage = request.messages.find((m) => m.role === "system");
    const userMessages = request.messages.filter((m) => m.role !== "system");
    const body = {
      model: this.mapModel(request.model),
      max_tokens: request.maxTokens || 4096,
      temperature: request.temperature,
      messages: userMessages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content
      }))
    };
    if (systemMessage) {
      body.system = systemMessage.content;
    }
    const response = await fetch(`${this.getBaseUrl()}/messages`, {
      method: "POST",
      headers: {
        "x-api-key": this.getApiKey(),
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
    }
    const data = await response.json();
    return {
      id: data.id || this.generateId(),
      model: data.model || request.model,
      choices: [{
        index: 0,
        message: {
          role: "assistant",
          content: data.content?.[0]?.text || ""
        },
        finishReason: data.stop_reason || "stop"
      }],
      usage: data.usage ? {
        promptTokens: data.usage.input_tokens || 0,
        completionTokens: data.usage.output_tokens || 0,
        totalTokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0)
      } : void 0,
      created: Date.now()
    };
  }
  mapModel(model) {
    const mapping = {
      "claude-sonnet-4": "claude-sonnet-4-20250514",
      "claude-opus-4": "claude-opus-4-20251114",
      "claude-haiku-4": "claude-haiku-4-20250704",
      "sonnet": "claude-sonnet-4-20250514",
      "opus": "claude-opus-4-20251114",
      "haiku": "claude-haiku-4-20250704"
    };
    return mapping[model] || model;
  }
};

// src/providers/google.ts
var GoogleProvider = class extends BaseLLMProvider {
  baseUrl = "https://generativelanguage.googleapis.com/v1beta";
  constructor() {
    super();
    this.provider = "google";
    this.name = "Google";
  }
  getDefaultBaseUrl() {
    return this.baseUrl;
  }
  async complete(request) {
    this.ensureInitialized();
    const model = this.mapModel(request.model);
    const messages = this.convertMessages(request.messages);
    const body = {
      contents: messages,
      generationConfig: {
        temperature: request.temperature,
        maxOutputTokens: request.maxTokens,
        topP: request.topP
      }
    };
    const url = `${this.getBaseUrl()}/models/${model}:generateContent?key=${this.getApiKey()}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Google API error: ${error.error?.message || response.statusText}`);
    }
    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return {
      id: data.id || this.generateId(),
      model: data.modelVersion || request.model,
      choices: [{
        index: 0,
        message: {
          role: "assistant",
          content
        },
        finishReason: data.candidates?.[0]?.finishReason || "STOP"
      }],
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0
      },
      created: Date.now()
    };
  }
  mapModel(model) {
    const mapping = {
      "gemini-2.5-pro": "gemini-2.5-pro-preview-0605",
      "gemini-2.5-flash": "gemini-2.5-flash-preview-0605",
      "gemini-1.5-pro": "gemini-1.5-pro",
      "gemini-1.5-flash": "gemini-1.5-flash",
      "pro": "gemini-2.5-pro-preview-0605",
      "flash": "gemini-2.5-flash-preview-0605"
    };
    return mapping[model] || model;
  }
  convertMessages(messages) {
    return messages.map((m) => ({
      role: m.role === "system" ? "user" : m.role,
      parts: [{ text: m.content }]
    }));
  }
};

// src/providers/xai.ts
var XAIProvider = class extends BaseLLMProvider {
  baseUrl = "https://api.x.ai/v1";
  constructor() {
    super();
    this.provider = "xai";
    this.name = "xAI";
  }
  getDefaultBaseUrl() {
    return this.baseUrl;
  }
  async complete(request) {
    this.ensureInitialized();
    const body = {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      stream: false
    };
    const response = await fetch(`${this.getBaseUrl()}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.getApiKey()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`xAI API error: ${error.error?.message || response.statusText}`);
    }
    const data = await response.json();
    return {
      id: data.id || this.generateId(),
      model: data.model || request.model,
      choices: data.choices?.map((c) => ({
        index: c.index || 0,
        message: {
          role: c.message?.role || "assistant",
          content: c.message?.content || ""
        },
        finishReason: c.finish_reason || "stop"
      })) || [],
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens || 0,
        completionTokens: data.usage.completion_tokens || 0,
        totalTokens: data.usage.total_tokens || 0
      } : void 0,
      created: data.created || Date.now()
    };
  }
  async *stream(request) {
    this.ensureInitialized();
    const body = {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      stream: true
    };
    const response = await fetch(`${this.getBaseUrl()}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.getApiKey()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      throw new Error(`xAI API error: ${response.statusText}`);
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        if (trimmed === "data: [DONE]") return;
        try {
          const data = JSON.parse(trimmed.slice(6));
          yield {
            id: data.id,
            choices: [{
              index: 0,
              delta: data.choices?.[0]?.delta || {},
              finishReason: data.choices?.[0]?.finish_reason
            }]
          };
        } catch {
        }
      }
    }
  }
};

// src/providers/deepseek.ts
var DeepSeekProvider = class extends BaseLLMProvider {
  baseUrl = "https://api.deepseek.com/v1";
  constructor() {
    super();
    this.provider = "deepseek";
    this.name = "DeepSeek";
  }
  getDefaultBaseUrl() {
    return this.baseUrl;
  }
  async complete(request) {
    this.ensureInitialized();
    const body = {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      stream: false
    };
    const response = await fetch(`${this.getBaseUrl()}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.getApiKey()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`DeepSeek API error: ${error.error?.message || response.statusText}`);
    }
    const data = await response.json();
    return {
      id: data.id || this.generateId(),
      model: data.model || request.model,
      choices: data.choices?.map((c) => ({
        index: c.index || 0,
        message: {
          role: c.message?.role || "assistant",
          content: c.message?.content || ""
        },
        finishReason: c.finish_reason || "stop"
      })) || [],
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens || 0,
        completionTokens: data.usage.completion_tokens || 0,
        totalTokens: data.usage.total_tokens || 0
      } : void 0,
      created: data.created || Date.now()
    };
  }
};

// src/providers/moonshot.ts
var MoonshotProvider = class extends BaseLLMProvider {
  baseUrl = "https://api.moonshot.cn/v1";
  constructor() {
    super();
    this.provider = "moonshot";
    this.name = "Moonshot";
  }
  getDefaultBaseUrl() {
    return this.baseUrl;
  }
  async complete(request) {
    this.ensureInitialized();
    const body = {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      stream: false
    };
    const response = await fetch(`${this.getBaseUrl()}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.getApiKey()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Moonshot API error: ${error.error?.message || response.statusText}`);
    }
    const data = await response.json();
    return {
      id: data.id || this.generateId(),
      model: data.model || request.model,
      choices: data.choices?.map((c) => ({
        index: c.index || 0,
        message: {
          role: c.message?.role || "assistant",
          content: c.message?.content || ""
        },
        finishReason: c.finish_reason || "stop"
      })) || [],
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens || 0,
        completionTokens: data.usage.completion_tokens || 0,
        totalTokens: data.usage.total_tokens || 0
      } : void 0,
      created: data.created || Date.now()
    };
  }
};

// src/providers/opencode.ts
var OPENCODE_MODELS = ["big-pickle", "gpt-5-nano", "kimi-k2.5-free", "minimax-m2.5-free"];
var OpenCodeProvider = class extends BaseLLMProvider {
  baseUrl = "https://api.opencode.ai/v1";
  constructor() {
    super();
    this.provider = "opencode";
    this.name = "OpenCode";
  }
  getDefaultBaseUrl() {
    return this.baseUrl;
  }
  supportsModel(modelId) {
    return OPENCODE_MODELS.includes(modelId) || modelId.startsWith("opencode/");
  }
  async complete(request) {
    this.ensureInitialized();
    const model = request.model.replace("opencode/", "");
    const body = {
      model,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      stream: false
    };
    if (request.tools) {
      body.tools = request.tools;
    }
    try {
      const response = await fetch(`${this.getBaseUrl()}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.getApiKey()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(`OpenCode API error: ${error.error?.message || response.statusText}`);
      }
      const data = await response.json();
      return {
        id: data.id || this.generateId(),
        model: data.model || request.model,
        choices: data.choices?.map((c) => ({
          index: c.index || 0,
          message: {
            role: c.message?.role || "assistant",
            content: c.message?.content || "",
            toolCalls: c.message?.tool_calls
          },
          finishReason: c.finish_reason || "stop"
        })) || [],
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens || 0,
          completionTokens: data.usage.completion_tokens || 0,
          totalTokens: data.usage.total_tokens || 0
        } : void 0,
        created: data.created || Date.now()
      };
    } catch (err) {
      throw new Error(`OpenCode request failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  async *stream(request) {
    this.ensureInitialized();
    const model = request.model.replace("opencode/", "");
    const body = {
      model,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      stream: true
    };
    const response = await fetch(`${this.getBaseUrl()}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.getApiKey()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      throw new Error(`OpenCode API error: ${response.statusText}`);
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        if (trimmed === "data: [DONE]") return;
        try {
          const data = JSON.parse(trimmed.slice(6));
          yield {
            id: data.id,
            choices: [{
              index: 0,
              delta: data.choices?.[0]?.delta || {},
              finishReason: data.choices?.[0]?.finish_reason
            }]
          };
        } catch {
        }
      }
    }
  }
};

// src/providers/azure.ts
var AzureProvider = class extends BaseLLMProvider {
  name = "Azure";
  getDefaultBaseUrl() {
    return this.config.baseUrl || "";
  }
  async complete(request) {
    this.ensureInitialized();
    const body = {
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      stream: false
    };
    const deploymentName = request.model;
    const url = `${this.getBaseUrl()}/openai/deployments/${deploymentName}/chat/completions?api-version=2024-02-15-preview`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "api-key": this.getApiKey(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Azure API error: ${error.error?.message || response.statusText}`);
    }
    const data = await response.json();
    return {
      id: data.id || this.generateId(),
      model: data.model || request.model,
      choices: data.choices?.map((c) => ({
        index: c.index || 0,
        message: { role: c.message?.role || "assistant", content: c.message?.content || "" },
        finishReason: c.finish_reason || "stop"
      })) || [],
      usage: data.usage,
      created: Date.now()
    };
  }
};

// src/providers/anyscale.ts
var AnyscaleProvider = class extends BaseLLMProvider {
  name = "Anyscale";
  baseUrl = "https://api.endpoints.anyscale.com/v1";
  getDefaultBaseUrl() {
    return this.baseUrl;
  }
  async complete(request) {
    this.ensureInitialized();
    const body = { model: request.model, messages: request.messages, temperature: request.temperature, max_tokens: request.maxTokens, stream: false };
    const response = await fetch(`${this.getBaseUrl()}/chat/completions`, { method: "POST", headers: { "Authorization": `Bearer ${this.getApiKey()}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error(`Anyscale API error: ${response.statusText}`);
    const data = await response.json();
    return { id: data.id || this.generateId(), model: data.model || request.model, choices: data.choices?.map((c) => ({ index: c.index || 0, message: { role: c.message?.role || "assistant", content: c.message?.content || "" }, finishReason: c.finish_reason || "stop" })) || [], usage: data.usage, created: Date.now() };
  }
};

// src/providers/together.ts
var TogetherProvider = class extends BaseLLMProvider {
  name = "Together";
  baseUrl = "https://api.together.xyz/v1";
  getDefaultBaseUrl() {
    return this.baseUrl;
  }
  async complete(request) {
    this.ensureInitialized();
    const body = { model: request.model, messages: request.messages, temperature: request.temperature, max_tokens: request.maxTokens, stream: false };
    const response = await fetch(`${this.getBaseUrl()}/chat/completions`, { method: "POST", headers: { "Authorization": `Bearer ${this.getApiKey()}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error(`Together API error: ${response.statusText}`);
    const data = await response.json();
    return { id: data.id || this.generateId(), model: data.model || request.model, choices: data.choices?.map((c) => ({ index: c.index || 0, message: { role: c.message?.role || "assistant", content: c.message?.content || "" }, finishReason: c.finish_reason || "stop" })) || [], usage: data.usage, created: Date.now() };
  }
};

// src/providers/fireworks.ts
var FireworksProvider = class extends BaseLLMProvider {
  name = "Fireworks";
  baseUrl = "https://api.fireworks.ai/inference/v1";
  getDefaultBaseUrl() {
    return this.baseUrl;
  }
  async complete(request) {
    this.ensureInitialized();
    const body = { model: request.model, messages: request.messages, temperature: request.temperature, max_tokens: request.maxTokens, stream: false };
    const response = await fetch(`${this.getBaseUrl()}/chat/completions`, { method: "POST", headers: { "Authorization": `Bearer ${this.getApiKey()}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error(`Fireworks API error: ${response.statusText}`);
    const data = await response.json();
    return { id: data.id || this.generateId(), model: data.model || request.model, choices: data.choices?.map((c) => ({ index: c.index || 0, message: { role: c.message?.role || "assistant", content: c.message?.content || "" }, finishReason: c.finish_reason || "stop" })) || [], usage: data.usage, created: Date.now() };
  }
};

// src/providers/mistral.ts
var MistralProvider = class extends BaseLLMProvider {
  baseUrl = "https://api.mistral.ai/v1";
  getDefaultBaseUrl() {
    return this.baseUrl;
  }
  constructor() {
    super();
    this.provider = "mistral";
    this.name = "Mistral";
  }
  async complete(request) {
    this.ensureInitialized();
    const body = { model: request.model, messages: request.messages, temperature: request.temperature, max_tokens: request.maxTokens, stream: false };
    const response = await fetch(`${this.getBaseUrl()}/chat/completions`, { method: "POST", headers: { "Authorization": `Bearer ${this.getApiKey()}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error(`Mistral API error: ${response.statusText}`);
    const data = await response.json();
    return { id: data.id || this.generateId(), model: data.model || request.model, choices: data.choices?.map((c) => ({ index: c.index || 0, message: { role: c.message?.role || "assistant", content: c.message?.content || "" }, finishReason: c.finish_reason || "stop" })) || [], usage: data.usage, created: Date.now() };
  }
};

// src/providers/cohere.ts
var CohereProvider = class extends BaseLLMProvider {
  baseUrl = "https://api.cohere.ai/v1";
  getDefaultBaseUrl() {
    return this.baseUrl;
  }
  constructor() {
    super();
    this.provider = "cohere";
    this.name = "Cohere";
  }
  async complete(request) {
    this.ensureInitialized();
    const body = { model: request.model, messages: request.messages, temperature: request.temperature, max_tokens: request.maxTokens, stream: false };
    const response = await fetch(`${this.getBaseUrl()}/chat`, { method: "POST", headers: { "Authorization": `Bearer ${this.getApiKey()}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error(`Cohere API error: ${response.statusText}`);
    const data = await response.json();
    return { id: data.id || this.generateId(), model: data.model || request.model, choices: [{ index: 0, message: { role: "assistant", content: data.text || "" }, finishReason: "stop" }], usage: data.usage, created: Date.now() };
  }
};

// src/providers/perplexity.ts
var PerplexityProvider = class extends BaseLLMProvider {
  baseUrl = "https://api.perplexity.ai";
  getDefaultBaseUrl() {
    return this.baseUrl;
  }
  constructor() {
    super();
    this.provider = "perplexity";
    this.name = "Perplexity";
  }
  async complete(request) {
    this.ensureInitialized();
    const body = { model: request.model, messages: request.messages, temperature: request.temperature, max_tokens: request.maxTokens, stream: false };
    const response = await fetch(`${this.getBaseUrl()}/chat/completions`, { method: "POST", headers: { "Authorization": `Bearer ${this.getApiKey()}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error(`Perplexity API error: ${response.statusText}`);
    const data = await response.json();
    return { id: data.id || this.generateId(), model: data.model || request.model, choices: data.choices?.map((c) => ({ index: c.index || 0, message: { role: c.message?.role || "assistant", content: c.message?.content || "" }, finishReason: c.finish_reason || "stop" })) || [], usage: data.usage, created: Date.now() };
  }
};

// src/router/smart-router.ts
var SmartRouter = class {
  manager;
  defaultTier = "medium";
  TIER_CONFIG = {
    simple: { primary: "gemini-2.5-flash", fallback: ["gpt-4o-mini", "claude-haiku-4"] },
    medium: { primary: "grok-3-fast", fallback: ["gpt-4o", "claude-sonnet-4"] },
    complex: { primary: "gemini-2.5-pro", fallback: ["claude-opus-4", "gpt-4o"] },
    reasoning: { primary: "o3-mini", fallback: ["grok-3-fast", "deepseek-v3"] },
    vision: { primary: "gpt-4o", fallback: ["claude-sonnet-4", "gemini-2.5-pro"] }
  };
  constructor(manager2) {
    this.manager = manager2;
  }
  /**
   * Route to best model for auto mode
   */
  async routeAuto() {
    if (this.manager.isProviderAvailable("opencode")) {
      return { modelId: "big-pickle", provider: "opencode", capabilities: {} };
    }
    const directProviders = ["openai", "anthropic", "google", "xai", "deepseek"];
    for (const p of directProviders) {
      if (this.manager.isProviderAvailable(p)) {
        const model = this.TIER_CONFIG[this.defaultTier].primary;
        return { modelId: model, provider: p, capabilities: {} };
      }
    }
    if (this.manager.isProviderAvailable("openrouter")) {
      return { modelId: this.TIER_CONFIG[this.defaultTier].primary, provider: "openrouter", capabilities: {} };
    }
    const available = this.manager.getEnabledProviders();
    if (available.length > 0) {
      return { modelId: "gpt-4o", provider: available[0], capabilities: {} };
    }
    throw new Error("No LLM providers configured");
  }
  /**
   * Decide routing based on request
   */
  async decide(request) {
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
      fallbackChain: this.getFallback(resolved.provider, resolved.modelId)
    };
  }
  /**
   * Classify request into tier
   */
  classifyRequest(request) {
    const content = request.messages.map((m) => m.content).join(" ").toLowerCase();
    if (/prove|explain.*step|calculate|derive|logic|proof|theorem|math/i.test(content)) {
      return "reasoning";
    }
    if (request.messages.some((m) => typeof m.content === "object" && m.content.some((p) => p.type === "image_url"))) {
      return "vision";
    }
    const totalLength = content.length;
    if (totalLength < 200) return "simple";
    if (totalLength < 2e3) return "medium";
    return "complex";
  }
  /**
   * Get fallback chain for a provider
   */
  getFallback(provider, model) {
    const fallbacks = [];
    const all = this.manager.getEnabledProviders();
    for (const p of all) {
      if (p !== provider) fallbacks.push(p);
    }
    return fallbacks;
  }
};

// src/stats.ts
var StatsCollector = class {
  stats = /* @__PURE__ */ new Map();
  recordRequest(provider, promptTokens, completionTokens, latencyMs) {
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
  recordError(provider) {
    const stat = this.stats.get(provider);
    if (stat) stat.errors++;
  }
  getAggregated() {
    let totalRequests = 0, totalPrompt = 0, totalCompletion = 0, totalCost = 0, totalErrors = 0;
    for (const stat of this.stats.values()) {
      totalRequests += stat.requests;
      totalPrompt += stat.promptTokens;
      totalCompletion += stat.completionTokens;
      totalErrors += stat.errors;
    }
    return { totalRequests, totalPromptTokens: totalPrompt, totalCompletionTokens: totalCompletion, totalCost, totalErrors, byProvider: Array.from(this.stats.values()), savingsVsOpenRouter: 0 };
  }
};

// src/models.ts
var MODELS = {
  // OpenAI
  "gpt-4o": {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    contextWindow: 128e3,
    maxOutputTokens: 16384,
    capabilities: { streaming: true, functionCalling: true, vision: true },
    pricing: { input: 5, output: 15 }
  },
  "gpt-4o-mini": {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    contextWindow: 128e3,
    maxOutputTokens: 16384,
    capabilities: { streaming: true, functionCalling: true, vision: true },
    pricing: { input: 0.15, output: 0.6 }
  },
  "gpt-5": {
    id: "gpt-5",
    name: "GPT-5",
    provider: "openai",
    contextWindow: 2e5,
    maxOutputTokens: 32e3,
    capabilities: { streaming: true, functionCalling: true, vision: true, reasoning: true },
    pricing: { input: 10, output: 30 }
  },
  "o3": {
    id: "o3",
    name: "OpenAI o3",
    provider: "openai",
    contextWindow: 2e5,
    maxOutputTokens: 32e3,
    capabilities: { streaming: false, functionCalling: true, reasoning: true },
    pricing: { input: 10, output: 40 }
  },
  "o3-mini": {
    id: "o3-mini",
    name: "OpenAI o3-mini",
    provider: "openai",
    contextWindow: 128e3,
    maxOutputTokens: 32e3,
    capabilities: { streaming: false, functionCalling: true, reasoning: true },
    pricing: { input: 1.1, output: 4.4 }
  },
  // Anthropic
  "claude-sonnet-4": {
    id: "claude-sonnet-4",
    name: "Claude Sonnet 4",
    provider: "anthropic",
    contextWindow: 2e5,
    maxOutputTokens: 32e3,
    capabilities: { streaming: true, functionCalling: true, vision: true },
    pricing: { input: 3, output: 15 }
  },
  "claude-opus-4": {
    id: "claude-opus-4",
    name: "Claude Opus 4",
    provider: "anthropic",
    contextWindow: 2e5,
    maxOutputTokens: 32e3,
    capabilities: { streaming: true, functionCalling: true, vision: true },
    pricing: { input: 15, output: 75 }
  },
  "claude-haiku-4": {
    id: "claude-haiku-4",
    name: "Claude Haiku 4",
    provider: "anthropic",
    contextWindow: 2e5,
    maxOutputTokens: 32e3,
    capabilities: { streaming: true, functionCalling: true, vision: true },
    pricing: { input: 0.8, output: 4 }
  },
  // Google
  "gemini-2.5-pro": {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "google",
    contextWindow: 1e6,
    maxOutputTokens: 64e3,
    capabilities: { streaming: true, functionCalling: true, vision: true, reasoning: true },
    pricing: { input: 1.25, output: 5 }
  },
  "gemini-2.5-flash": {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "google",
    contextWindow: 1e6,
    maxOutputTokens: 64e3,
    capabilities: { streaming: true, functionCalling: true, vision: true },
    pricing: { input: 0.075, output: 0.3 }
  },
  // xAI
  "grok-4": {
    id: "grok-4",
    name: "Grok 4",
    provider: "xai",
    contextWindow: 2e5,
    maxOutputTokens: 32e3,
    capabilities: { streaming: true, functionCalling: true, reasoning: true },
    pricing: { input: 5, output: 15 }
  },
  "grok-3-fast": {
    id: "grok-3-fast",
    name: "Grok 3 Fast",
    provider: "xai",
    contextWindow: 131072,
    maxOutputTokens: 32768,
    capabilities: { streaming: true, functionCalling: true },
    pricing: { input: 3, output: 15 }
  },
  "grok-3": {
    id: "grok-3",
    name: "Grok 3",
    provider: "xai",
    contextWindow: 131072,
    maxOutputTokens: 32768,
    capabilities: { streaming: true, functionCalling: true },
    pricing: { input: 5, output: 15 }
  },
  // DeepSeek
  "deepseek-v3": {
    id: "deepseek-v3",
    name: "DeepSeek V3",
    provider: "deepseek",
    contextWindow: 64e3,
    maxOutputTokens: 32e3,
    capabilities: { streaming: true, functionCalling: true },
    pricing: { input: 0.27, output: 1.1 }
  },
  "deepseek-chat": {
    id: "deepseek-chat",
    name: "DeepSeek Chat",
    provider: "deepseek",
    contextWindow: 64e3,
    maxOutputTokens: 32e3,
    capabilities: { streaming: true },
    pricing: { input: 0.14, output: 0.28 }
  },
  // Moonshot (Kimi)
  "kimi-k2.5": {
    id: "kimi-k2.5",
    name: "Kimi K2.5",
    provider: "moonshot",
    contextWindow: 128e3,
    maxOutputTokens: 32e3,
    capabilities: { streaming: true, functionCalling: true, vision: true },
    pricing: { input: 0.6, output: 2 }
  },
  "kimi-k2.5-mini": {
    id: "kimi-k2.5-mini",
    name: "Kimi K2.5 Mini",
    provider: "moonshot",
    contextWindow: 128e3,
    maxOutputTokens: 32e3,
    capabilities: { streaming: true, functionCalling: true, vision: true },
    pricing: { input: 0.2, output: 0.6 }
  },
  // OpenCode
  "big-pickle": {
    id: "big-pickle",
    name: "Big Pickle",
    provider: "opencode",
    contextWindow: 2e5,
    maxOutputTokens: 32e3,
    capabilities: { streaming: true, functionCalling: true, reasoning: true },
    pricing: { input: 0, output: 0 }
    // Free
  },
  "gpt-5-nano": {
    id: "gpt-5-nano",
    name: "GPT-5 Nano",
    provider: "opencode",
    contextWindow: 128e3,
    maxOutputTokens: 32e3,
    capabilities: { streaming: true, functionCalling: true },
    pricing: { input: 0, output: 0 }
    // Free
  },
  "kimi-k2.5-free": {
    id: "kimi-k2.5-free",
    name: "Kimi K2.5 Free",
    provider: "opencode",
    contextWindow: 128e3,
    maxOutputTokens: 32e3,
    capabilities: { streaming: true, functionCalling: true },
    pricing: { input: 0, output: 0 }
    // Free
  },
  "minimax-m2.5-free": {
    id: "minimax-m2.5-free",
    name: "MiniMax M2.5 Free",
    provider: "opencode",
    contextWindow: 128e3,
    maxOutputTokens: 32e3,
    capabilities: { streaming: true, functionCalling: true },
    pricing: { input: 0, output: 0 }
    // Free
  },
  // OpenRouter (meta-provider, routes to others)
  "openrouter/auto": {
    id: "openrouter/auto",
    name: "OpenRouter Auto",
    provider: "openrouter",
    contextWindow: 128e3,
    maxOutputTokens: 32e3,
    capabilities: { streaming: true, functionCalling: true }
  }
};
var MODEL_ALIASES = [
  { alias: "auto", model: "omni-llm/auto" },
  { alias: "sonnet", model: "claude-sonnet-4" },
  { alias: "opus", model: "claude-opus-4" },
  { alias: "haiku", model: "claude-haiku-4" },
  { alias: "gpt", model: "gpt-4o" },
  { alias: "gpt-mini", model: "gpt-4o-mini" },
  { alias: "flash", model: "gemini-2.5-flash" },
  { alias: "pro", model: "gemini-2.5-pro" },
  { alias: "deepseek", model: "deepseek-v3" },
  { alias: "grok", model: "grok-3" },
  { alias: "grok-reasoning", model: "grok-3-fast" },
  { alias: "kimi", model: "kimi-k2.5" },
  { alias: "big-pickle", model: "big-pickle", provider: "opencode" },
  { alias: "gpt-nano", model: "gpt-5-nano", provider: "opencode" },
  { alias: "reasoner", model: "o3-mini" },
  { alias: "reasoning", model: "o3" }
];
function getModel(modelId) {
  return MODELS[modelId];
}
function resolveModelAlias(alias) {
  const found = MODEL_ALIASES.find((a) => a.alias === alias);
  return found?.model || alias;
}

// src/core/manager.ts
var PROVIDER_CLASSES = {
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
  perplexity: PerplexityProvider
};
var LLMProviderManager = class {
  api;
  config;
  apiKeys;
  providers = /* @__PURE__ */ new Map();
  eventHandlers = [];
  router;
  stats;
  started = false;
  constructor(api, config, apiKeys) {
    this.api = api;
    this.config = config;
    this.apiKeys = apiKeys;
    this.router = new SmartRouter(this);
    this.stats = new StatsCollector();
  }
  /**
   * Register all enabled providers
   */
  async registerAll() {
    const enabledProviders = Object.entries(this.config).filter(([_, cfg]) => cfg.enabled).map(([provider]) => provider);
    for (const provider of enabledProviders) {
      await this.registerProvider(provider);
    }
  }
  /**
   * Register a single provider
   */
  async registerProvider(providerId) {
    const providerConfig = this.config[providerId];
    if (!providerConfig?.enabled) {
      return;
    }
    const ProviderClass = PROVIDER_CLASSES[providerId];
    if (!ProviderClass) {
      throw new Error(`No provider implementation: ${providerId}`);
    }
    const mergedConfig = {
      ...providerConfig,
      ...this.apiKeys[providerId] || {}
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
  async startAll() {
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
  async stopAll() {
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
  getProvider(providerId) {
    return this.providers.get(providerId);
  }
  /**
   * Get all registered providers
   */
  getAllProviders() {
    return this.providers;
  }
  /**
   * Check if provider is available
   */
  isProviderAvailable(providerId) {
    return this.providers.has(providerId);
  }
  /**
   * Get enabled providers
   */
  getEnabledProviders() {
    return Array.from(this.providers.keys());
  }
  /**
   * Complete a chat completion request
   */
  async complete(request) {
    const startTime = Date.now();
    const resolved = await this.resolveModel(request.model);
    const provider = this.providers.get(resolved.provider);
    if (!provider) {
      throw new Error(`Provider not available: ${resolved.provider}`);
    }
    try {
      const providerRequest = { ...request, model: resolved.modelId };
      const response = await provider.complete(providerRequest);
      this.stats.recordRequest(
        resolved.provider,
        response.usage?.promptTokens || 0,
        response.usage?.completionTokens || 0,
        Date.now() - startTime
      );
      this.emitEvent({
        type: "response",
        provider: resolved.provider,
        model: resolved.modelId,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        tokens: response.usage
      });
      return response;
    } catch (err) {
      const fallback = this.router.getFallback(resolved.provider, resolved.modelId);
      if (fallback.length > 0) {
        this.emitEvent({
          type: "fallback",
          provider: resolved.provider,
          model: resolved.modelId,
          timestamp: Date.now(),
          error: err instanceof Error ? err.message : String(err)
        });
        for (const fbProvider of fallback) {
          const fbProviderInstance = this.providers.get(fbProvider);
          if (fbProviderInstance) {
            try {
              const response = await fbProviderInstance.complete({
                ...request,
                model: resolved.modelId
                // Use same model ID if available
              });
              this.stats.recordRequest(fbProvider, response.usage?.promptTokens || 0, response.usage?.completionTokens || 0, Date.now() - startTime);
              return response;
            } catch {
              continue;
            }
          }
        }
      }
      throw err;
    }
  }
  /**
   * Resolve model to provider
   */
  async resolveModel(model) {
    if (model === "omni-llm/auto" || model === "auto") {
      return this.router.routeAuto();
    }
    const resolvedModelId = resolveModelAlias(model);
    const modelInfo = getModel(resolvedModelId);
    if (modelInfo) {
      return {
        modelId: resolvedModelId,
        provider: modelInfo.provider,
        capabilities: modelInfo.capabilities
      };
    }
    for (const [providerId, provider] of this.providers) {
      if (resolvedModelId.startsWith(providerId) || provider.supportsModel(resolvedModelId)) {
        return {
          modelId: resolvedModelId,
          provider: providerId,
          capabilities: {}
        };
      }
    }
    const firstProvider = this.getEnabledProviders()[0];
    if (!firstProvider) {
      throw new Error("No LLM providers configured");
    }
    return {
      modelId: resolvedModelId,
      provider: firstProvider,
      capabilities: {}
    };
  }
  /**
   * Route to best model based on request characteristics
   */
  async routeRequest(request) {
    return this.router.decide(request);
  }
  /**
   * Register event handler
   */
  onEvent(handler) {
    this.eventHandlers.push(handler);
  }
  /**
   * Emit event to handlers
   */
  emitEvent(event) {
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
  getStats() {
    return this.stats.getAggregated();
  }
};

// src/commands/stats.ts
async function createStatsCommand() {
  return {
    name: "stats",
    description: "Show OmniLLM usage statistics",
    acceptsArgs: true,
    requireAuth: false,
    handler: async (ctx) => {
      return { text: "Stats command - implement with manager.getStats()" };
    }
  };
}

// src/commands/providers.ts
async function createProvidersCommand(manager2) {
  return {
    name: "providers",
    description: "Show configured LLM providers",
    acceptsArgs: false,
    requireAuth: false,
    handler: async () => {
      const providers = manager2.getEnabledProviders();
      const lines = ["**OmniLLM Providers:**", ""];
      for (const p of providers) {
        lines.push(`\u2022 ${p}`);
      }
      return { text: lines.join("\n") };
    }
  };
}

// src/config/index.ts
function loadProviderConfig(pluginConfig) {
  const defaultConfig = {
    openrouter: { enabled: false },
    openai: { enabled: false },
    anthropic: { enabled: false },
    google: { enabled: false },
    xai: { enabled: false },
    deepseek: { enabled: false },
    moonshot: { enabled: false },
    opencode: { enabled: false },
    azure: { enabled: false },
    anyscale: { enabled: false },
    together: { enabled: false },
    fireworks: { enabled: false },
    mistral: { enabled: false },
    cohere: { enabled: false },
    perplexity: { enabled: false }
  };
  let config = { ...defaultConfig };
  if (pluginConfig?.providers) {
    const providers = pluginConfig.providers;
    for (const [provider, cfg] of Object.entries(providers)) {
      if (isValidProvider(provider)) {
        config[provider] = { ...defaultConfig[provider], ...cfg };
      }
    }
  }
  config = applyEnvOverrides(config);
  return { providers: config, routing: pluginConfig?.routing };
}
function applyEnvOverrides(config) {
  if (process.env.OPENROUTER_API_KEY) {
    config.openrouter = { ...config.openrouter, enabled: true, apiKey: process.env.OPENROUTER_API_KEY };
  }
  if (process.env.OPENAI_API_KEY) {
    config.openai = { ...config.openai, enabled: true, apiKey: process.env.OPENAI_API_KEY };
  }
  if (process.env.ANTHROPIC_API_KEY) {
    config.anthropic = { ...config.anthropic, enabled: true, apiKey: process.env.ANTHROPIC_API_KEY };
  }
  if (process.env.GOOGLE_API_KEY) {
    config.google = { ...config.google, enabled: true, apiKey: process.env.GOOGLE_API_KEY };
  }
  if (process.env.XAI_API_KEY) {
    config.xai = { ...config.xai, enabled: true, apiKey: process.env.XAI_API_KEY };
  }
  if (process.env.DEEPSEEK_API_KEY) {
    config.deepseek = { ...config.deepseek, enabled: true, apiKey: process.env.DEEPSEEK_API_KEY };
  }
  if (process.env.MOONSHOT_API_KEY) {
    config.moonshot = { ...config.moonshot, enabled: true, apiKey: process.env.MOONSHOT_API_KEY };
  }
  if (process.env.OPENCODE_API_KEY) {
    config.opencode = { ...config.opencode, enabled: true, apiKey: process.env.OPENCODE_API_KEY };
  }
  if (process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT) {
    config.azure = {
      ...config.azure,
      enabled: true,
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      baseUrl: process.env.AZURE_OPENAI_ENDPOINT
    };
  }
  if (process.env.ANYSCALE_API_KEY) {
    config.anyscale = { ...config.anyscale, enabled: true, apiKey: process.env.ANYSCALE_API_KEY };
  }
  if (process.env.TOGETHER_API_KEY) {
    config.together = { ...config.together, enabled: true, apiKey: process.env.TOGETHER_API_KEY };
  }
  if (process.env.FIREWORKS_API_KEY) {
    config.fireworks = { ...config.fireworks, enabled: true, apiKey: process.env.FIREWORKS_API_KEY };
  }
  if (process.env.MISTRAL_API_KEY) {
    config.mistral = { ...config.mistral, enabled: true, apiKey: process.env.MISTRAL_API_KEY };
  }
  if (process.env.COHERE_API_KEY) {
    config.cohere = { ...config.cohere, enabled: true, apiKey: process.env.COHERE_API_KEY };
  }
  if (process.env.PERPLEXITY_API_KEY) {
    config.perplexity = { ...config.perplexity, enabled: true, apiKey: process.env.PERPLEXITY_API_KEY };
  }
  return config;
}
function isValidProvider(provider) {
  const validProviders = [
    "openrouter",
    "openai",
    "anthropic",
    "google",
    "xai",
    "deepseek",
    "moonshot",
    "opencode",
    "azure",
    "anyscale",
    "together",
    "fireworks",
    "mistral",
    "cohere",
    "perplexity"
  ];
  return validProviders.includes(provider);
}
function loadApiKeysFromEnv() {
  return {
    openrouter: { apiKey: process.env.OPENROUTER_API_KEY },
    openai: { apiKey: process.env.OPENAI_API_KEY },
    anthropic: { apiKey: process.env.ANTHROPIC_API_KEY },
    google: { apiKey: process.env.GOOGLE_API_KEY },
    xai: { apiKey: process.env.XAI_API_KEY },
    deepseek: { apiKey: process.env.DEEPSEEK_API_KEY },
    moonshot: { apiKey: process.env.MOONSHOT_API_KEY },
    opencode: { apiKey: process.env.OPENCODE_API_KEY },
    azure: { apiKey: process.env.AZURE_OPENAI_API_KEY, endpoint: process.env.AZURE_OPENAI_ENDPOINT },
    anyscale: { apiKey: process.env.ANYSCALE_API_KEY },
    together: { apiKey: process.env.TOGETHER_API_KEY },
    fireworks: { apiKey: process.env.FIREWORKS_API_KEY },
    mistral: { apiKey: process.env.MISTRAL_API_KEY },
    cohere: { apiKey: process.env.COHERE_API_KEY },
    perplexity: { apiKey: process.env.PERPLEXITY_API_KEY }
  };
}

// src/index.ts
var manager = null;
var plugin = {
  id: "omni-llm",
  name: "OmniLLM",
  description: "Multi-provider LLM router - OpenRouter, OpenAI, Anthropic, Google, xAI, DeepSeek, OpenCode and more",
  version: VERSION,
  register(api) {
    const isDisabled = process.env.OMNI_LLM_DISABLED === "true" || process.env.OMNI_LLM_DISABLED === "1";
    if (isDisabled) {
      api.logger.info("OmniLLM disabled (OMNI_LLM_DISABLED=true)");
      return;
    }
    const { providers: config } = loadProviderConfig(api.pluginConfig || {});
    const apiKeys = loadApiKeysFromEnv();
    const enabledProviders = Object.entries(config.providers).filter(([_, cfg]) => cfg.enabled).map(([provider]) => provider);
    if (enabledProviders.length === 0) {
      api.logger.warn("OmniLLM: No providers enabled! Configure at least one provider.");
      return;
    }
    api.logger.info(`OmniLLM initializing with providers: ${enabledProviders.join(", ")}`);
    manager = new LLMProviderManager(api, config, apiKeys);
    manager.registerAll().then(() => {
      api.logger.info(`OmniLLM ready - ${enabledProviders.length} provider(s) registered`);
    }).catch((err) => {
      api.logger.error(`OmniLLM initialization failed: ${err.message}`);
    });
    Promise.all([
      createStatsCommand(),
      createProvidersCommand(manager)
    ]).then(([statsCmd, providersCmd]) => {
      api.registerCommand(statsCmd);
      api.registerCommand(providersCmd);
    }).catch((err) => {
      api.logger.warn(`Failed to register commands: ${err.message}`);
    });
    api.registerService({
      id: "omni-llm",
      start: async () => {
        if (manager) await manager.startAll();
      },
      stop: async () => {
        if (manager) {
          await manager.stopAll();
          manager = null;
        }
      }
    });
  }
};
var index_default = plugin;
export {
  BaseLLMProvider,
  LLMProviderManager,
  index_default as default
};
//# sourceMappingURL=index.js.map