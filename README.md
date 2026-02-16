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

## Commands

- `/providers` — Show configured providers
- `/stats` — Show usage statistics

## License

MIT
