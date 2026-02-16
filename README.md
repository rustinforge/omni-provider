# OmniLLM

Multi-provider LLM router for OpenClaw — supports 15+ providers with smart routing.

## Supported Providers

- **OpenRouter** — One key for all models
- **OpenAI** — GPT-4o, GPT-5, o-series
- **Anthropic** — Claude Sonnet, Opus, Haiku
- **Google** — Gemini 2.5 Pro/Flash
- **xAI** — Grok 3/4
- **DeepSeek** — V3, Chat
- **Moonshot** — Kimi K2.5
- **OpenCode** — Big Pickle, GPT-5 Nano, Kimi Free, MiniMax Free (FREE)
- **Azure** — Azure OpenAI
- **Anyscale, Together, Fireworks, Mistral, Cohere, Perplexity**

## Quick Start

```bash
# Install
openclaw plugins install ./omni-llm

# Set API keys
export OPENCODE_API_KEY=your-key
export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-ant-...

# Use auto-routing
openclaw models set omni-llm/auto
```

## Environment Variables

| Variable | Provider |
|----------|----------|
| `OPENCODE_API_KEY` | OpenCode (free models) |
| `OPENAI_API_KEY` | OpenAI |
| `ANTHROPIC_API_KEY` | Anthropic |
| `GOOGLE_API_KEY` | Google |
| `XAI_API_KEY` | xAI |
| `DEEPSEEK_API_KEY` | DeepSeek |
| `MOONSHOT_API_KEY` | Moonshot |
| `OPENROUTER_API_KEY` | OpenRouter |
| `AZURE_OPENAI_API_KEY` | Azure |

## Features

- **Smart Routing** — Auto-selects best model based on request complexity
- **Fallback Chain** — Tries alternatives if primary fails
- **Cost Tracking** — Monitor spend across providers
- **Free Models First** — Prioritizes OpenCode free models

## Usage Examples

### Programmatic API

```typescript
import { LLMProviderManager } from './src/index.js';
import type { ChatCompletionRequest, ProvidersConfig, ApiKeysConfig } from './src/types.js';

// Configure providers
const config: ProvidersConfig = {
  opencode: { enabled: true },  // Free models
  openai: { enabled: true },
  anthropic: { enabled: true },
};

const apiKeys: ApiKeysConfig = {
  openai: { apiKey: process.env.OPENAI_API_KEY! },
  anthropic: { apiKey: process.env.ANTHROPIC_API_KEY! },
};

// Create manager (when integrated with OpenClaw, this is done for you)
const manager = new LLMProviderManager(api, config, apiKeys);
await manager.registerAll();
await manager.startAll();
```

### Making Requests

```typescript
// Basic chat completion
const response = await manager.complete({
  model: 'gpt-4o',
  messages: [
    { role: 'user', content: 'Hello, how are you?' }
  ],
  temperature: 0.7,
  maxTokens: 1000,
});

console.log(response.choices[0].message.content);
console.log(`Tokens used: ${response.usage?.totalTokens}`);
```

### Auto-Routing (Smart Selection)

```typescript
// Use automatic model selection based on request
const response = await manager.complete({
  model: 'omni-llm/auto',  // or just 'auto'
  messages: [
    { role: 'user', content: 'Explain quantum computing in simple terms' }
  ],
});

// The router automatically:
// 1. Checks for free providers (OpenCode) first
// 2. Falls back to direct providers (OpenAI, Anthropic, Google, xAI)
// 3. Uses OpenRouter as fallback
// 4. Classifies request complexity (simple/medium/complex/reasoning/vision)
```

### Provider-Specific Examples

```typescript
// Direct provider usage
await manager.complete({
  model: 'claude-sonnet-4',  // Routes to Anthropic
  messages: [{ role: 'user', content: 'Write a poem' }],
});

await manager.complete({
  model: 'gemini-2.5-pro',  // Routes to Google
  messages: [{ role: 'user', content: 'Analyze this data' }],
});

await manager.complete({
  model: 'deepseek-v3',  // Routes to DeepSeek
  messages: [{ role: 'user', content: 'Code review this' }],
});

// Using model aliases
await manager.complete({
  model: 'sonnet',  // Resolves to claude-sonnet-4
  messages: [{ role: 'user', content: 'Help with writing' }],
});

await manager.complete({
  model: 'flash',  // Resolves to gemini-2.5-flash
  messages: [{ role: 'user', content: 'Quick summary' }],
});
```

### Free Models (OpenCode)

```typescript
// Use completely free models
const response = await manager.complete({
  model: 'big-pickle',  // Free - OpenCode provider
  messages: [{ role: 'user', content: 'What is 2+2?' }],
});

// Other free models available:
await manager.complete({
  model: 'gpt-5-nano',  // Free
  messages: [{ role: 'user', content: 'Hello' }],
});

await manager.complete({
  model: 'kimi-k2.5-free',  // Free
  messages: [{ role: 'user', content: 'Summarize this' }],
});
```

### Streaming Requests

```typescript
// Stream responses from supported providers
const provider = manager.getProvider('openai');
if (!provider) throw new Error('OpenAI not available');

const stream = await provider.stream({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Write a story about a robot' }],
});

for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content;
  if (content) process.stdout.write(content);
}
```

### Multiple Providers with Fallback

```typescript
// Manual provider fallback chain
async function completeWithFallback(
  managers: LLMProviderManager,
  request: ChatCompletionRequest,
  providerOrder: LLMProvider[]
): Promise<ChatCompletionResponse> {
  let lastError: Error | null = null;
  
  for (const providerId of providerOrder) {
    const provider = managers.getProvider(providerId);
    if (!provider) continue;
    
    try {
      return await provider.complete(request);
    } catch (err) {
      lastError = err as Error;
      console.log(`Fallback: ${providerId} failed, trying next...`);
    }
  }
  
  throw lastError || new Error('All providers failed');
}

// Use: GPT-4o → Claude → Gemini → DeepSeek
const response = await completeWithFallback(manager, {
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Explain neural networks' }],
}, ['openai', 'anthropic', 'google', 'deepseek']);
```

### Advanced Options

```typescript
// Function calling
const response = await manager.complete({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'What\'s the weather in NYC?' }],
  tools: [
    {
      type: 'function',
      function: {
        name: 'get_weather',
        description: 'Get weather for a location',
        parameters: {
          type: 'object',
          properties: {
            location: { type: 'string' },
          },
          required: ['location'],
        },
      },
    },
  ],
});

// JSON response format
const response = await manager.complete({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Return user info as JSON' }],
  responseFormat: { type: 'json_object' },
});

// Reasoning models
const response = await manager.complete({
  model: 'o3-mini',
  messages: [{ role: 'user', content: 'Prove that sqrt(2) is irrational' }],
});
```

### Configuration Options

```typescript
// Full provider configuration with custom settings
const config: ProvidersConfig = {
  // Free provider - no API key needed
  opencode: { 
    enabled: true,
    priority: 10,  // Higher = preferred
  },
  
  // Direct providers
  openai: {
    enabled: true,
    apiKey: process.env.OPENAI_API_KEY!,
    models: ['gpt-4o', 'gpt-4o-mini'],  // Limit models
    priority: 5,
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
    },
  },
  
  anthropic: {
    enabled: true,
    apiKey: process.env.ANTHROPIC_API_KEY!,
    baseUrl: 'https://api.anthropic.com',  // Custom endpoint
    priority: 4,
  },
  
  // Azure OpenAI
  azure: {
    enabled: true,
    apiKey: process.env.AZURE_OPENAI_API_KEY!,
    baseUrl: process.env.AZURE_OPENAI_ENDPOINT!,  // e.g., https://your-resource.openai.azure.com/
  },
};

// Azure also requires these env vars:
// AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
// AZURE_OPENAI_API_VERSION=2024-02-15-preview
```

### Routing Decision Info

```typescript
// Get routing decision details before making request
const decision = await manager.routeRequest({
  model: 'omni-llm/auto',
  messages: [{ role: 'user', content: 'Calculate 15 * 23 + 7' }],
});

console.log(`Selected: ${decision.provider}/${decision.model}`);
console.log(`Tier: ${decision.tier}`);
console.log(`Fallback chain: ${decision.fallbackChain.join(', ')}`);
console.log(`Estimated savings: ${decision.savings * 100}%`);
```

### Cost Tracking

```typescript
// Get usage statistics
const stats = manager.getStats();

console.log(`Total requests: ${stats.totalRequests}`);
console.log(`Total prompt tokens: ${stats.totalPromptTokens}`);
console.log(`Total completion tokens: ${stats.totalCompletionTokens}`);
console.log(`Total cost: $${stats.totalCost.toFixed(4)}`);
console.log(`Total errors: ${stats.totalErrors}`);

// Per-provider breakdown
for (const providerStats of stats.byProvider) {
  console.log(`${providerStats.provider}:`);
  console.log(`  Requests: ${providerStats.requests}`);
  console.log(`  Avg latency: ${providerStats.avgLatency.toFixed(0)}ms`);
  console.log(`  Errors: ${providerStats.errors}`);
}
```

### Event Handling

```typescript
// Listen for events
manager.onEvent((event) => {
  switch (event.type) {
    case 'request':
      console.log(`Request to ${event.provider}/${event.model}`);
      break;
    case 'response':
      console.log(`Response from ${event.provider} in ${event.duration}ms`);
      console.log(`Tokens: ${event.tokens?.totalTokens}`);
      break;
    case 'error':
      console.log(`Error: ${event.error}`);
      break;
    case 'fallback':
      console.log(`Fallback triggered for ${event.provider}`);
      break;
  }
});
```

### OpenClaw Integration

When installed as an OpenClaw plugin, use the `/models` command:

```bash
# Use auto-routing (recommended)
omni-llm/auto

# Use specific providers
omni-llm/sonnet    # Claude Sonnet 4
omni-llm/opus      # Claude Opus 4
omni-llm/haiku     # Claude Haiku 4
omni-llm/gpt       # GPT-4o
omni-llm/gpt-mini  # GPT-4o Mini
omni-llm/flash     # Gemini 2.5 Flash
omni-llm/pro       # Gemini 2.5 Pro
omni-llm/deepseek  # DeepSeek V3
omni-llm/grok      # Grok 3
omni-llm/kimi      # Kimi K2.5
omni-llm/big-pickle # FREE - OpenCode
omni-llm/gpt-nano  # FREE - OpenCode
omni-llm/reasoner  # o3-mini
omni-llm/reasoning # o3
```

## Commands

- `/providers` — Show configured providers
- `/stats` — Show usage statistics

## License

MIT
