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

## Installation

### Prerequisites

- Node.js 20+
- OpenClaw installed

### Build the Project

```bash
# Navigate to the project directory
cd omni-provider

# Install dependencies
npm install

# Build the TypeScript project
npm run build
```

### Install in OpenClaw

```bash
# Install as OpenClaw plugin
openclaw plugins install ./omni-provider

# Or link for development
openclaw plugins link ./omni-provider
```

### Configure API Keys

Set environment variables for the providers you want to use:

```bash
# Free models (no API key required)
# Uses OpenCode's free tier

# OpenAI
export OPENAI_API_KEY=sk-your-key

# Anthropic
export ANTHROPIC_API_KEY=sk-ant-your-key

# Google
export GOOGLE_API_KEY=your-google-key

# xAI
export XAI_API_KEY=your-xai-key

# DeepSeek
export DEEPSEEK_API_KEY=your-deepseek-key

# OpenRouter (unified API for many models)
export OPENROUTER_API_KEY=your-openrouter-key

# Azure OpenAI
export AZURE_OPENAI_API_KEY=your-azure-key
export AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
export AZURE_OPENAI_API_VERSION=2024-02-15-preview
```

### Configuration File

Create or update `openclaw.plugin.json` in the plugin directory:

```json
{
  "providers": {
    "opencode": {
      "enabled": true,
      "priority": 10
    },
    "openai": {
      "enabled": true,
      "priority": 5
    },
    "anthropic": {
      "enabled": true,
      "priority": 4
    },
    "google": {
      "enabled": true,
      "priority": 3
    },
    "deepseek": {
      "enabled": true,
      "priority": 2
    }
  }
}
```

### Use with OpenClaw

```bash
# Set default model to auto-routing
openclaw models set omni-llm/auto

# Use specific providers
openclaw models set omni-llm/sonnet
openclaw models set omni-llm/big-pickle
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
| `AZURE_OPENAI_ENDPOINT` | Azure (endpoint URL) |
| `AZURE_OPENAI_API_VERSION` | Azure (API version) |

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Build TypeScript to JavaScript |
| `npm run dev` | Build in watch mode |
| `npm run typecheck` | Type-check without building |
| `npm run lint` | Run ESLint |
| `npm run test` | Run all tests |
| `npm run test:unit` | Run unit tests |
| `npm run test:integration` | Run integration tests |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage |

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

### Vision/Multimodal Requests

```typescript
// Image analysis with GPT-4o or Claude
const response = await manager.complete({
  model: 'gpt-4o',
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'What do you see in this image?' },
        { type: 'image_url', image_url: { url: 'https://example.com/image.jpg' } }
      ]
    }
  ],
});

// Also works with base64 images
const response2 = await manager.complete({
  model: 'claude-sonnet-4',
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Analyze this chart' },
        { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,...' } }
      ]
    }
  ],
});
```

### Model Information API

```typescript
import { getModel, getFreeModels, getModelsByProvider, resolveModelAlias } from 'omni-llm';

// Get specific model info
const modelInfo = getModel('gpt-4o');
console.log(`Context window: ${modelInfo?.contextWindow}`);
console.log(`Max output: ${modelInfo?.maxOutputTokens}`);
console.log(`Pricing: $${modelInfo?.pricing?.input}/M in`);

// Resolve an alias to actual model
const resolved = resolveModelAlias('sonnet');
console.log(resolved); // 'claude-sonnet-4'

// Get all free models
const freeModels = getFreeModels();
freeModels.forEach(m => console.log(`${m.name}: ${m.pricing?.input === 0 ? 'FREE' : ''}`));

// Get models by provider
const anthropicModels = getModelsByProvider('anthropic');
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

## Supported Models

### Quick Reference

| Alias | Model | Provider | Context | Price (per 1M) |
|-------|-------|----------|---------|----------------|
| `gpt` | GPT-4o | OpenAI | 128K | $5 in / $15 out |
| `gpt-mini` | GPT-4o Mini | OpenAI | 128K | $0.15 / $0.60 |
| `sonnet` | Claude Sonnet 4 | Anthropic | 200K | $3 / $15 |
| `opus` | Claude Opus 4 | Anthropic | 200K | $15 / $75 |
| `haiku` | Claude Haiku 4 | Anthropic | 200K | $0.80 / $4 |
| `flash` | Gemini 2.5 Flash | Google | 1M | $0.075 / $0.30 |
| `pro` | Gemini 2.5 Pro | Google | 1M | $1.25 / $5 |
| `deepseek` | DeepSeek V3 | DeepSeek | 64K | $0.27 / $1.10 |
| `grok` | Grok 3 | xAI | 128K | $5 / $15 |
| `kimi` | Kimi K2.5 | Moonshot | 128K | $0.60 / $2 |
| `reasoner` | o3-mini | OpenAI | 128K | $1.10 / $4.40 |
| `reasoning` | o3 | OpenAI | 200K | $10 / $40 |
| `big-pickle` | Big Pickle | OpenCode | 200K | **FREE** |
| `gpt-nano` | GPT-5 Nano | OpenCode | 128K | **FREE** |
| `kimi-free` | Kimi K2.5 Free | OpenCode | 128K | **FREE** |

### Model Capabilities

| Model | Streaming | Function Calling | Vision | Reasoning |
|-------|-----------|------------------|--------|-----------|
| GPT-4o | ✅ | ✅ | ✅ | ❌ |
| GPT-4o Mini | ✅ | ✅ | ✅ | ❌ |
| Claude Sonnet 4 | ✅ | ✅ | ✅ | ❌ |
| Claude Opus 4 | ✅ | ✅ | ✅ | ❌ |
| Claude Haiku 4 | ✅ | ✅ | ✅ | ❌ |
| Gemini 2.5 Pro | ✅ | ✅ | ✅ | ✅ |
| Gemini 2.5 Flash | ✅ | ✅ | ✅ | ❌ |
| DeepSeek V3 | ✅ | ✅ | ❌ | ❌ |
| Grok 3 | ✅ | ✅ | ❌ | ✅ |
| o3-mini | ❌ | ✅ | ❌ | ✅ |
| Big Pickle | ✅ | ✅ | ❌ | ✅ |

## Routing Tiers

The smart router automatically classifies requests into tiers:

- **simple** — Short queries (<200 chars): Uses Gemini 2.5 Flash
- **medium** — Standard requests (200-2000 chars): Uses Grok 3 Fast
- **complex** — Long context (>2000 chars): Uses Gemini 2.5 Pro
- **reasoning** — Math, proofs, logic: Uses o3-mini
- **vision** — Image analysis: Uses GPT-4o

```typescript
// Automatic tier classification
const response = await manager.complete({
  model: 'omni-llm/auto',
  messages: [{ role: 'user', content: 'Prove that sqrt(2) is irrational' }],
});
// → Uses reasoning tier (o3-mini)

const response = await manager.complete({
  model: 'omni-llm/auto', 
  messages: [{ role: 'user', content: [{ type: 'image_url', image_url: { url: '...' } }] }],
});
// → Uses vision tier (GPT-4o)
```

## OpenClaw Commands

```bash
# Show all enabled providers
/providers

# Show usage statistics
/stats

# Use with model aliases
/omni-llm/auto        # Auto-select best model
/omni-llm/sonnet      # Claude Sonnet 4
/omni-llm/big-pickle  # FREE - OpenCode
/omni-llm/reasoner    # o3-mini
```

## Advanced Routing

### Manual Tier Selection

```typescript
// Force specific tier behavior
const response = await manager.complete({
  model: 'gpt-4o',  // Use specific model, not auto
  messages: [{ role: 'user', content: 'Complex analysis task' }],
});
```

### Custom Fallback Chains

```typescript
// Custom provider priority order
const config: ProvidersConfig = {
  opencode: { enabled: true, priority: 100 },  // Free first
  anthropic: { enabled: true, priority: 50 },
  google: { enabled: true, priority: 40 },
  openai: { enabled: true, priority: 30 },
  deepseek: { enabled: true, priority: 20 },   // Cheap fallback
};
```

### Checking Provider Availability

```typescript
// Check if provider is available
if (manager.isProviderEnabled('opencode')) {
  console.log('Free models available!');
}

// Get list of enabled providers
const providers = manager.getEnabledProviders();
console.log('Enabled:', providers);

// Get specific provider
const provider = manager.getProvider('openai');
```

### Error Handling

```typescript
import { LLMProviderManager } from './src/index.js';

// Basic error handling with try-catch
try {
  const response = await manager.complete({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: 'Hello' }],
  });
  console.log(response.choices[0].message.content);
} catch (error) {
  if (error instanceof Error) {
    console.error(`Error: ${error.message}`);
  }
}

// Handling specific provider errors
async function completeWithErrorHandling(
  manager: LLMProviderManager,
  request: ChatCompletionRequest
): Promise<ChatCompletionResponse> {
  try {
    return await manager.complete(request);
  } catch (error) {
    const err = error as Error;
    
    // Handle rate limiting (429 errors)
    if (err.message.includes('429') || err.message.includes('rate limit')) {
      console.log('Rate limited, waiting and retrying...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      return await manager.complete(request);
    }
    
    // Handle authentication errors (401)
    if (err.message.includes('401') || err.message.includes('unauthorized')) {
      console.error('Invalid API key - check your credentials');
      throw new Error('Authentication failed. Please check API keys.');
    }
    
    // Handle insufficient quota (403)
    if (err.message.includes('403') || err.message.includes('quota')) {
      console.error('API quota exceeded');
      throw new Error('Provider quota exceeded. Try a different provider.');
    }
    
    // Handle timeout errors
    if (err.message.includes('timeout') || err.message.includes('ETIMEDOUT')) {
      console.log('Request timed out, retrying with different provider...');
      // Could implement fallback here
      throw error;
    }
    
    // Re-throw unknown errors
    throw error;
  }
}

// Comprehensive error handling with fallback chain
async function robustComplete(
  manager: LLMProviderManager,
  request: ChatCompletionRequest
): Promise<ChatCompletionResponse> {
  const providers: LLMProvider[] = ['opencode', 'openai', 'anthropic', 'google', 'deepseek'];
  let lastError: Error | null = null;
  
  for (const providerId of providers) {
    const provider = manager.getProvider(providerId);
    if (!provider || !manager.isProviderEnabled(providerId)) {
      continue;
    }
    
    try {
      // Try with this provider's model
      const providerRequest = { ...request };
      console.log(`Trying ${providerId}...`);
      return await provider.complete(providerRequest);
    } catch (error) {
      lastError = error as Error;
      console.warn(`${providerId} failed: ${lastError.message}`);
      // Continue to next provider
    }
  }
  
  throw new Error(`All providers failed. Last error: ${lastError?.message}`);
}

// Using the event system for error logging
manager.onEvent((event) => {
  if (event.type === 'error') {
    // Log to your preferred logging service
    console.error({
      timestamp: new Date(event.timestamp).toISOString(),
      provider: event.provider,
      model: event.model,
      error: event.error,
      duration: event.duration,
    });
  }
});

// Checking provider health before requests
async function checkProviderHealth(provider: BaseLLMProvider): Promise<boolean> {
  try {
    // Many providers have a /models endpoint for health checks
    // For this example, we do a minimal request
    await provider.complete({
      model: 'test',  // Some providers accept any model for health check
      messages: [{ role: 'user', content: 'ping' }],
      maxTokens: 1,
    });
    return true;
  } catch {
    return false;
  }
}

// Graceful degradation - use fallback model if primary fails
async function completeWithGracefulDegradation(
  manager: LLMProviderManager,
  messages: ChatMessage[]
): Promise<ChatCompletionResponse> {
  // Primary: Try GPT-4o
  try {
    return await manager.complete({
      model: 'gpt-4o',
      messages,
      temperature: 0.7,
    });
  } catch (error) {
    console.warn('GPT-4o failed, trying fallback...');
  }
  
  // Fallback 1: Try Claude
  try {
    return await manager.complete({
      model: 'claude-sonnet-4',
      messages,
      temperature: 0.7,
    });
  } catch (error) {
    console.warn('Claude failed, trying fallback...');
  }
  
  // Fallback 2: Try Gemini
  try {
    return await manager.complete({
      model: 'gemini-2.5-pro',
      messages,
      temperature: 0.7,
    });
  } catch (error) {
    console.warn('Gemini failed, trying free model...');
  }
  
  // Fallback 3: Use free model
  return await manager.complete({
    model: 'big-pickle',
    messages,
    temperature: 0.7,
  });
}
```

### Validation Helpers

```typescript
// Validate request before sending
import { validateChatRequest, ValidationError } from './src/index.js';

try {
  validateChatRequest({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: 'Hello' }],
    temperature: 2.0,  // Invalid - must be 0-2
  });
} catch (error) {
  if (error instanceof ValidationError) {
    console.log(`Validation failed: ${error.message}`);
    console.log(`Field: ${error.field}`);
  }
}

// Check if model supports required features
import { getModel, ModelCapabilityError } from './src/index.js';

const modelInfo = getModel('gpt-4o');
if (!modelInfo?.capabilities.vision) {
  throw new Error('Model does not support vision');
}
```

### Retry Configuration

```typescript
// Custom retry logic with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on auth errors
      if (error instanceof Error && 
          (error.message.includes('401') || error.message.includes('unauthorized'))) {
        throw error;
      }
      
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
        console.log(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

// Usage
const response = await withRetry(() => 
  manager.complete({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: 'Hello' }],
  })
);
```

## API Reference

### Main Exports

```typescript
// Core
import { LLMProviderManager } from 'omni-llm';
import { BaseLLMProvider } from 'omni-llm';

// Model utilities
import { 
  getModel,           // Get model info by ID
  getFreeModels,      // Get all free models
  getModelsByProvider, // Get models for specific provider
  resolveModelAlias,  // Resolve alias to actual model
  MODELS,             // All available models
  MODEL_ALIASES       // All model aliases
} from 'omni-llm';

// Types
import type {
  LLMProvider,              // Provider ID type
  ProvidersConfig,         // Provider configuration
  ProviderConfig,          // Single provider config
  ApiKeysConfig,           // API keys configuration
  ChatCompletionRequest,   // Request payload
  ChatCompletionResponse,  // Response payload
  ChatMessage,             // Message format
  RoutingDecision,         // Routing decision info
  RoutingTier,             // Tier type (simple/medium/complex/reasoning/vision)
  ModelInfo,               // Model metadata
  AggregatedStats,         // Usage statistics
  LLMEvent,                // Event type
  EventHandler             // Event handler type
} from 'omni-llm';
```

### LLMProviderManager Methods

| Method | Description |
|--------|-------------|
| `registerAll()` | Register all enabled providers |
| `registerProvider(id)` | Register a single provider |
| `startAll()` | Start all providers |
| `stopAll()` | Stop all providers |
| `complete(request)` | Make a chat completion request |
| `getProvider(id)` | Get provider by ID |
| `isProviderEnabled(id)` | Check if provider is enabled |
| `getEnabledProviders()` | Get list of enabled providers |
| `routeRequest(request)` | Get routing decision |
| `getStats()` | Get usage statistics |
| `onEvent(handler)` | Register event handler |

### Provider Types

```typescript
type LLMProvider = 
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
  | 'nvidia';
```

### Request/Response Types

```typescript
interface ChatCompletionRequest {
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

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

interface ChatCompletionResponse {
  id: string;
  model: string;
  choices: Choice[];
  usage?: Usage;
  created: number;
}
```

## License

MIT
