# OmniLLM Delivery Plan

## Overview
Multi-provider LLM router for OpenClaw with smart routing, fallback chains, and comprehensive testing.

---

## Phase 1: Core Infrastructure (Week 1)

### 1.1 CI/CD Pipeline
- [ ] GitHub Actions workflow for CI
- [ ] Lint + type check on PR
- [ ] Unit tests with Vitest
- [ ] E2E tests with mocked API responses
- [ ] Build verification on every PR
- [ ] Auto-publish to npm on tag

### 1.2 Testing Framework
- [ ] Set up Vitest + coverage
- [ ] Mock utilities for all 15+ providers
- [ ] Provider API response fixtures
- [ ] Integration tests for routing logic
- [ ] Load testing for concurrent requests

---

## Phase 2: Provider Implementations (Week 2)

### 2.1 Core Providers (Must Have)
- [ ] OpenCode provider (free models - priority!)
- [ ] OpenRouter provider
- [ ] OpenAI provider
- [ ] Anthropic provider
- [ ] Google provider
- [ ] xAI provider

### 2.2 Additional Providers
- [ ] DeepSeek
- [ ] Moonshot (Kimi)
- [ ] Azure OpenAI
- [ ] Anyscale
- [ ] Together AI
- [ ] Fireworks
- [ ] Mistral
- [ ] Cohere
- [ ] Perplexity

---

## Phase 3: Smart Routing (Week 2-3)

### 3.1 Routing Logic
- [ ] Request classifier (simple/medium/complex/reasoning/vision)
- [ ] Cost estimation per model
- [ ] Fallback chain implementation
- [ ] Provider health checking
- [ ] Latency-based routing option

### 3.2 Features
- [ ] Model alias resolution
- [ ] Streaming support
- [ ] Function calling support
- [ ] Vision multimodal support

---

## Phase 4: Production Hardening (Week 3-4)

### 4.1 Reliability
- [ ] Rate limiting per provider
- [ ] Retry logic with exponential backoff
- [ ] Circuit breaker pattern
- [ ] Request deduplication

### 4.2 Observability
- [ ] Structured logging
- [ ] Metrics export (Prometheus)
- [ ] Cost tracking per provider
- [ ] Usage statistics command

### 4.3 Configuration
- [ ] Environment variable support
- [ ] Config file support (JSON/YAML)
- [ ] Provider priority ordering
- [ ] Model allowlist/blocklist

---

## Phase 5: OpenClaw Integration (Week 4)

### 5.1 Plugin Features
- [ ] Provider registration
- [ ] Command registration (/providers, /stats, /cost)
- [ ] Model injection into OpenClaw config
- [ ] Webhook handling for updates

### 5.2 User Experience
- [ ] /omni models command
- [ ] /omni providers status
- [ ] /omni cost breakdown
- [ ] /omni switch provider

---

## CI/CD Specification

### GitHub Actions Workflow

```yaml
name: CI

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm run lint
      - run: pnpm run typecheck
      - run: pnpm run test
      - run: pnpm run build

  e2e:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm run test:e2e

  publish:
    needs: [test, e2e]
    if: startsWith(github.ref, 'refs/tags/v')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      - run: pnpm install
      - run: pnpm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Test Structure

```
tests/
├── unit/
│   ├── providers/
│   │   ├── opencode.test.ts
│   │   ├── openai.test.ts
│   │   └── ...
│   ├── router/
│   │   ├── classifier.test.ts
│   │   ├── fallback.test.ts
│   │   └── cost.test.ts
│   └── config.test.ts
├── integration/
│   ├── routing.test.ts
│   ├── failover.test.ts
│   └── streaming.test.ts
├── e2e/
│   ├── mock-server.ts
│   └── providers.test.ts
└── fixtures/
    ├── openai/
    ├── anthropic/
    └── ...
```

---

## Definition of Done

- [ ] All 15 providers implemented and tested
- [ ] CI pipeline passing
- [ ] 80%+ test coverage
- [ ] E2E tests for critical paths
- [ ] Documentation complete
- [ ] Published to npm
- [ ] Successfully installs in OpenClaw
- [ ] Can route to at least 3 providers
- [ ] Cost tracking works

---

## Priority Order

1. OpenCode (free models - users want this most)
2. OpenAI + Anthropic + Google (most popular)
3. xAI + DeepSeek (growing popularity)
4. OpenRouter (fallback)
5. Remaining providers
6. Advanced routing features
7. Production hardening
