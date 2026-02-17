# Omni-LLM for OpenClaw

A smart multi-provider LLM router plugin for OpenClaw. Automatically route requests to the best available model from 15+ providers including OpenAI, Anthropic, Google, xAI, DeepSeek, Chutes, and free models from OpenCode.

## Quick Start

```bash
# Install the plugin
openclaw plugins install https://github.com/rustinforge/omni-provider

# Set environment variables
export OPENCODE_API_KEY="your-opencode-key"
export OPENAI_API_KEY="sk-your-key"
export ANTHROPIC_API_KEY="sk-ant-your-key"

# Use in OpenClaw
openclaw models set omni-llm/auto
```

## Features

- **Smart Auto-Routing** - Automatically picks the best model based on your request complexity
- **Free Models First** - Prioritizes free tier from OpenCode, Chutes, and NVIDIA
- **Intelligent Rotation** - Rotates between providers on rate limits or failures
- **Cost Optimization** - Routes simple queries to free models, complex tasks to paid models
- **15+ Providers** - OpenAI, Anthropic, Google, xAI, DeepSeek, Moonshot, OpenCode, Chutes, NVIDIA, Azure, and more

## Supported Models

| Command | Model | Provider | Price |
|---------|-------|----------|-------|
| `omni-llm/auto` | Auto-selected | Smart routing | Varies |
| `omni-llm/sonnet` | Claude Sonnet 4 | Anthropic | $3/M |
| `omni-llm/opus` | Claude Opus 4 | Anthropic | $15/M |
| `omni-llm/gpt` | GPT-4o | OpenAI | $5/M |
| `omni-llm/gpt-mini` | GPT-4o Mini | OpenAI | $0.15/M |
| `omni-llm/flash` | Gemini 2.5 Flash | Google | $0.075/M |
| `omni-llm/pro` | Gemini 2.5 Pro | Google | $1.25/M |
| `omni-llm/big-pickle` | Big Pickle | OpenCode | **FREE** |
| `omni-llm/gpt-nano` | GPT-5 Nano | OpenCode | **FREE** |
| `omni-llm/kimi-free` | Kimi K2.5 Free | OpenCode | **FREE** |
| `omni-llm/bossgirl` | Bossgirl | Chutes | **FREE** |
| `omni-llm/glm5` | GLM-5 | Chutes/NVIDIA | **FREE** |
| `omni-llm/deepseek` | DeepSeek V3 | DeepSeek | $0.27/M |
| `omni-llm/grok` | Grok 3 | xAI | $5/M |
| `omni-llm/nemotron` | Nemotron 70B | NVIDIA | **FREE** |

## Installation

### Prerequisites

- Node.js 20+
- OpenClaw 2026.2.14+

### From Source

```bash
git clone https://github.com/rustinforge/omni-provider.git
cd omni-provider
npm install
npm run build
openclaw plugins install ./omni-provider
```

### Environment Variables

Set these in your shell or systemd service:

```bash
# Free models (no API key needed)
# Uses OpenCode, Chutes, and NVIDIA free tiers automatically

# Free/discounted providers (API key required)
export OPENCODE_API_KEY="your-opencode-key"    # Big Pickle, GPT-5 Nano, Kimi Free
export CHUTES_API_KEY="your-chutes-key"        # Bossgirl, GLM-5, discounted models
export NVIDIA_API_KEY="your-nvidia-key"        # Nemotron 70B, Mistral Large

# Paid providers
export OPENAI_API_KEY="sk-your-key"
export ANTHROPIC_API_KEY="sk-ant-your-key"
export GOOGLE_API_KEY="your-google-key"
export XAI_API_KEY="your-xai-key"
export DEEPSEEK_API_KEY="your-deepseek-key"
export OPENROUTER_API_KEY="your-openrouter-key"
export AZURE_OPENAI_API_KEY="your-azure-key"
```

## Usage

### In OpenClaw Config

Set `omni-llm/auto` as your primary model:

```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "omni-llm/auto"
      },
      "models": {
        "omni-llm/auto": {"alias": "omni-auto"}
      }
    }
  },
  "plugins": {
    "entries": {
      "omni-llm": {"enabled": true}
    }
  }
}
```

### Model Aliases

Use short aliases for quick provider switching:

```bash
# Auto-routing (smart selection)
omni-llm/auto

# Claude models
omni-llm/sonnet    # Claude Sonnet 4 (balanced)
omni-llm/opus      # Claude Opus 4 (most capable)
omni-llm/haiku     # Claude Haiku 4 (fast)

# OpenAI models  
omni-llm/gpt       # GPT-4o
omni-llm/gpt-mini   # GPT-4o Mini (cheap)
omni-llm/reasoner   # o3-mini (reasoning)

# Google models
omni-llm/flash     # Gemini 2.5 Flash (fast)
omni-llm/pro       # Gemini 2.5 Pro (capable)

# Free OpenCode models
omni-llm/big-pickle  # Big Pickle (stealth model, free)
omni-llm/gpt-nano    # GPT-5 Nano (free)
omni-llm/kimi-free   # Kimi K2.5 Free

# Other providers
omni-llm/deepseek  # DeepSeek V3 (cheap)
omni-llm/grok      # Grok 3 (xAI)
omni-llm/kimi      # Kimi K2.5 (Moonshot)
```

## How It Works

### Smart Routing Tiers

The router classifies requests into tiers and rotates between available providers:

- **simple** (< 200 chars) → OpenCode Big Pickle, OpenRouter auto, free models
- **medium** (200-2000 chars) → Chutes GLM-5, Kimi K2.5, NVIDIA Nemotron
- **complex** (> 2000 chars) → Chutes high-perf, Claude Sonnet, Gemini Pro, GPT-4o
- **reasoning** (math/logic/code) → Chutes Kimi, DeepSeek R1, o3-mini, Claude Opus
- **vision** (images) → Big Pickle, Gemini Flash, GPT-4o, Claude Sonnet

### Provider Priority

1. **Free models** - OpenCode (Big Pickle, GPT-5 Nano), Chutes (GLM-5, Bossgirl), NVIDIA (Nemotron)
2. **Discounted providers** - Chutes (cheaper rates than direct)
3. **Direct providers** - OpenAI, Anthropic, Google, xAI, DeepSeek
4. **Meta-providers** - OpenRouter (fallback for all models)

### Fallback Chain

If a provider fails, automatically tries:
```
Free models → Direct providers → OpenRouter
```

## Plugin Commands

When installed, these commands are available in OpenClaw:

```bash
# Show configured providers
/providers

# Show usage statistics
/stats

# View provider details
openclaw plugins info omni-llm
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Run tests
npm run test

# Lint
npm run lint
```

## API Keys Required

| Provider | API Key | Cost |
|----------|---------|------|
| OpenCode | Optional | Many free models |
| OpenAI | Required | Paid |
| Anthropic | Required | Paid |
| Google | Required | Paid |
| xAI | Required | Paid |
| DeepSeek | Required | Cheap |
| Moonshot | Required | Moderate |
| OpenRouter | Required | Varies |
| Azure | Required | Enterprise |

## Troubleshooting

**Plugin not loading?**
```bash
# Check if plugin is enabled
openclaw plugins list

# Verify environment variables are set
env | grep API_KEY

# Check logs
journalctl -u openclaw -f
```

**Model not found error?**
Make sure you've added the model alias to your OpenClaw config:
```json
"models": {
  "omni-llm/auto": {"alias": "omni-auto"}
}
```

**Rate limited?**
The plugin automatically falls back to other providers. Just retry your request.

## License

MIT © 2026 Rustin Forge
