# OmniLLM

Multi-provider LLM router for OpenClaw. Route requests to 15+ providers with automatic fallback and cost optimization.

## Quick Start

```bash
# Install dependencies
npm install

# Build
npm run build

# Test
npm test
```

## Supported Providers

| Provider | Models | Key Required |
|----------|--------|--------------|
| **OpenCode** | Big Pickle, GPT-5 Nano, Kimi K2.5 Free | None (Free) |
| **OpenAI** | GPT-4o, GPT-4o-mini, o3, o3-mini, GPT-5 | `OPENAI_API_KEY` |
| **Anthropic** | Claude Sonnet, Opus, Haiku | `ANTHROPIC_API_KEY` |
| **Google** | Gemini 2.5 Pro/Flash | `GOOGLE_API_KEY` |
| **xAI** | Grok 3/4 Fast | `XAI_API_KEY` |
| **DeepSeek** | V3, Chat, Reasoner | `DEEPSEEK_API_KEY` |
| **Moonshot** | Kimi K2.5 | `MOONSHOT_API_KEY` |
| **NVIDIA** | GLM-5, Nemotron 70B, Mistral Large | `NVIDIA_API_KEY` |
| **Azure** | Azure OpenAI | `AZURE_OPENAI_*` |
| **OpenRouter** | 200+ models | `OPENROUTER_API_KEY` |
| **Anyscale, Together, Fireworks, Mistral, Cohere, Perplexity** | Various | Provider-specific |

## Configuration

### Environment Variables

```bash
# Free models (no key needed)
# OpenCode automatically available

# Paid providers
export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-ant-...
export GOOGLE_API_KEY=...
export XAI_API_KEY=...
export DEEPSEEK_API_KEY=...
export NVIDIA_API_KEY=nvapi-...
export OPENROUTER_API_KEY=...
```

### OpenClaw Plugin Config

Create `openclaw.plugin.json`:

```json
{
  "providers": {
    "opencode": { "enabled": true, "priority": 10 },
    "openai": { "enabled": true, "priority": 5 },
    "anthropic": { "enabled": true, "priority": 4 },
    "nvidia": { "enabled": true, "priority": 3 }
  }
}
```

Priority determines fallback order (higher = tried first).

## Usage

### CLI with OpenClaw

```bash
# Auto-route to best available model
openclaw models set omni-llm/auto

# Use specific model aliases
openclaw models set omni-llm/sonnet     # Claude Sonnet
openclaw models set omni-llm/gpt        # GPT-4o
openclaw models set omni-llm/big-pickle # Free OpenCode model
openclaw models set omni-llm/glm5       # NVIDIA GLM-5
```

### Programmatic API

```typescript
import { LLMProviderManager } from 'omni-llm';

const manager = new LLMProviderManager(api, config, apiKeys);
await manager.registerAll();

// Auto-routed request
const response = await manager.complete({
  model: 'omni-llm/auto',
  messages: [{ role: 'user', content: 'Hello!' }],
});

// Direct provider request
const claude = await manager.complete({
  model: 'claude-sonnet-4',
  messages: [{ role: 'user', content: 'Write code' }],
});
```

### Model Aliases

| Alias | Resolves To | Provider |
|-------|-------------|----------|
| `auto` | Auto-selected | Any |
| `sonnet` | claude-sonnet-4 | Anthropic |
| `opus` | claude-opus-4 | Anthropic |
| `gpt` | gpt-4o | OpenAI |
| `gpt-mini` | gpt-4o-mini | OpenAI |
| `reasoner` | o3-mini | OpenAI |
| `grok` | grok-3 | xAI |
| `kimi` | kimi-k2.5 | Moonshot |
| `big-pickle` | big-pickle | OpenCode (Free) |
| `glm5` | z-ai/glm5 | NVIDIA |
| `nemotron` | nvidia/llama-3.1-nemotron-70b-instruct | NVIDIA |

## Routing Logic

1. **Explicit model** → Use specified provider
2. **`auto` alias** → Evaluate request complexity
3. **Free providers first** (OpenCode)
4. **Direct providers** (OpenAI, Anthropic, etc.)
5. **OpenRouter fallback**
6. **On failure** → Try next in priority chain

Request tier classification:
- `simple` → Short queries, chat
- `medium` → Code, explanations
- `complex` → Analysis, writing
- `reasoning` → Math, logic, o-series
- `vision` → Image inputs

## Development

```bash
npm run build      # Compile TypeScript
npm run dev        # Watch mode
npm run lint       # ESLint check
npm run typecheck  # TypeScript check

npm test           # All tests (349)
npm run test:unit  # Unit tests only
npm run test:e2e   # E2E tests
npm run test:coverage
```

## Project Structure

```
src/
├── index.ts           # Plugin entry
├── core/
│   └── manager.ts     # Provider management
├── providers/         # 15 provider implementations
│   ├── openai.ts
│   ├── anthropic.ts
│   ├── nvidia.ts      # NEW: NVIDIA NIM support
│   └── ...
├── router/
│   └── smart-router.ts
├── models.ts          # Model definitions
└── types.ts

tests/
├── unit/              # Provider tests
├── integration/       # Routing tests
└── e2e/               # End-to-end tests
```

## License

MIT
