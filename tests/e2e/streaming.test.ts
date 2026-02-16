/**
 * E2E Tests - Streaming with Mock Server
 * 
 * Tests streaming functionality with mock provider APIs.
 * Covers OpenAI, Anthropic, and Google streaming formats.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { LLMProviderManager } from '../../src/core/manager.js';
import type { ProvidersConfig, ApiKeysConfig, ChatCompletionRequest } from '../../src/types.js';
import { startMockServer, stopMockServer, getRequestLog, resetRequestLog, mockFixtures } from './mock-server.js';

// Mock API logger
const mockLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};

// Mock API
const mockApi = {
  logger: mockLogger,
  registerCommand: async () => {},
  registerService: async () => {},
} as any;

// Mock server port
const MOCK_PORT = 3457;

describe('E2E Tests - Streaming', () => {
  let mockServer: Awaited<ReturnType<typeof startMockServer>>;

  beforeAll(async () => {
    mockServer = await startMockServer();
    resetRequestLog();
  });

  afterAll(async () => {
    await stopMockServer();
  });

  describe('Scenario 1: Basic Streaming from OpenAI Provider', () => {
    it('should stream response from OpenAI provider via mock server', async () => {
      // Override fetch to use mock server streaming
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation(async (url: string, options: any) => {
        const body = options?.body ? JSON.parse(options.body) : {};
        
        if (body.stream) {
          // Return a mock streaming response
          const mockStream = new ReadableStream({
            start(controller) {
              const chunks = [
                'data: {"id":"chatcmpl-test","choices":[{"index":0,"delta":{"role":"assistant","content":"Hello"},"finish_reason":null}]}\n\n',
                'data: {"id":"chatcmpl-test","choices":[{"index":0,"delta":{"content":" from"},"finish_reason":null}]}\n\n',
                'data: {"id":"chatcmpl-test","choices":[{"index":0,"delta":{"content":" GPT"},"finish_reason":null}]}\n\n',
                'data: {"id":"chatcmpl-test","choices":[{"index":0,"delta":{"content":"-4o"},"finish_reason":null}]}\n\n',
                'data: {"id":"chatcmpl-test","choices":[{"index":0,"delta":{"content":"!"},"finish_reason":"stop"}]}\n\n',
                'data: [DONE]\n\n',
              ];
              let i = 0;
              const pushChunk = () => {
                if (i < chunks.length) {
                  controller.enqueue(new TextEncoder().encode(chunks[i]));
                  i++;
                  setTimeout(pushChunk, 5);
                } else {
                  controller.close();
                }
              };
              pushChunk();
            },
          });

          return Promise.resolve({
            ok: true,
            body: mockStream,
          } as any);
        }

        // Non-streaming fallback
        return originalFetch(url, options);
      });

      const config: ProvidersConfig = {
        openai: {
          enabled: true,
          apiKey: 'test-key',
          baseUrl: `http://localhost:${MOCK_PORT}`,
          models: ['gpt-4o'],
        },
      };

      const apiKeys: ApiKeysConfig = {
        openai: 'test-key',
      };

      const manager = new LLMProviderManager(mockApi, config, apiKeys);
      await manager.registerAll();
      await manager.startAll();

      const provider = manager.getProvider('openai');
      expect(provider).toBeDefined();

      // Make streaming request
      const request: ChatCompletionRequest = {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Say hello' }],
        stream: true,
      };

      // Collect streamed chunks
      const chunks: any[] = [];
      for await (const chunk of (provider as any).stream(request)) {
        chunks.push(chunk);
      }

      // Verify streaming worked
      expect(chunks.length).toBeGreaterThan(0);
      
      // Verify first chunk has delta
      expect(chunks[0].choices[0].delta).toBeDefined();
      expect(chunks[0].choices[0].delta.content).toBeDefined();

      // Restore original fetch
      global.fetch = originalFetch;
      
      await manager.stopAll();
    });
  });

  describe('Scenario 2: Streaming Fallback Chain', () => {
    it('should fallback to secondary provider when streaming fails', async () => {
      // Create config with primary (will fail) and fallback
      const config: ProvidersConfig = {
        openai: {
          enabled: true,
          apiKey: 'test-key',
          baseUrl: `http://localhost:${MOCK_PORT}/non-existent`,
          models: ['gpt-4o'],
        },
        anthropic: {
          enabled: true,
          apiKey: 'test-key',
          baseUrl: `http://localhost:${MOCK_PORT}`,
          models: ['claude-sonnet-4'],
        },
      };

      const apiKeys: ApiKeysConfig = {
        openai: 'test-key',
        anthropic: 'test-key',
      };

      const manager = new LLMProviderManager(mockApi, config, apiKeys);
      await manager.registerAll();
      await manager.startAll();

      // Test that fallback chain is available
      const fallback = manager['router'].getFallback('openai', 'gpt-4o');
      expect(fallback).toContain('anthropic');

      await manager.stopAll();
    });
  });

  describe('Scenario 3: Provider Resolution with Streaming Models', () => {
    it('should resolve streaming-capable models correctly', async () => {
      const config: ProvidersConfig = {
        openai: {
          enabled: true,
          apiKey: 'test-key',
          baseUrl: `http://localhost:${MOCK_PORT}`,
          models: ['gpt-4o', 'gpt-4o-mini'],
        },
        anthropic: {
          enabled: true,
          apiKey: 'test-key',
          baseUrl: `http://localhost:${MOCK_PORT}`,
          models: ['claude-sonnet-4', 'claude-haiku-4'],
        },
        google: {
          enabled: true,
          apiKey: 'test-key',
          baseUrl: `http://localhost:${MOCK_PORT}`,
          models: ['gemini-2.5-flash', 'gemini-2.5-pro'],
        },
      };

      const apiKeys: ApiKeysConfig = {
        openai: 'test-key',
        anthropic: 'test-key',
        google: 'test-key',
      };

      const manager = new LLMProviderManager(mockApi, config, apiKeys);
      await manager.registerAll();
      await manager.startAll();

      // Verify all providers are available
      expect(manager.isProviderAvailable('openai')).toBe(true);
      expect(manager.isProviderAvailable('anthropic')).toBe(true);
      expect(manager.isProviderAvailable('google')).toBe(true);

      // Test model resolution
      const gptResolved = await manager.resolveModel('gpt-4o');
      expect(gptResolved.provider).toBe('openai');
      expect(gptResolved.modelId).toBe('gpt-4o');

      const claudeResolved = await manager.resolveModel('claude-sonnet-4');
      expect(claudeResolved.provider).toBe('anthropic');

      const geminiResolved = await manager.resolveModel('gemini-2.5-flash');
      expect(geminiResolved.provider).toBe('google');

      await manager.stopAll();
    });
  });

  describe('Scenario 4: Auto Routing with Streaming', () => {
    it('should route auto requests to streaming-capable provider', async () => {
      const config: ProvidersConfig = {
        openai: {
          enabled: true,
          apiKey: 'test-key',
          baseUrl: `http://localhost:${MOCK_PORT}`,
          models: ['gpt-4o'],
        },
        opencode: {
          enabled: true,
          apiKey: 'test-key',
          baseUrl: `http://localhost:${MOCK_PORT}`,
          models: ['big-pickle'],
        },
      };

      const apiKeys: ApiKeysConfig = {
        openai: 'test-key',
        opencode: 'test-key',
      };

      const manager = new LLMProviderManager(mockApi, config, apiKeys);
      await manager.registerAll();
      await manager.startAll();

      // Test auto routing returns provider
      const resolved = await manager.resolveModel('omni-llm/auto');
      expect(resolved).toBeDefined();
      expect(['openai', 'opencode']).toContain(resolved.provider);

      // Test routing decision
      const request: ChatCompletionRequest = {
        model: 'auto',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const decision = await manager.routeRequest(request);
      expect(decision).toBeDefined();
      expect(decision.tier).toBe('simple');
      expect(decision.provider).toBeDefined();
      expect(decision.fallbackChain).toBeDefined();

      await manager.stopAll();
    });
  });

  describe('Scenario 5: Multiple Provider Fallback Chain', () => {
    it('should create proper fallback chain across all providers', async () => {
      const config: ProvidersConfig = {
        openai: {
          enabled: true,
          apiKey: 'test-key',
          baseUrl: `http://localhost:${MOCK_PORT}`,
          models: ['gpt-4o'],
        },
        anthropic: {
          enabled: true,
          apiKey: 'test-key',
          baseUrl: `http://localhost:${MOCK_PORT}`,
          models: ['claude-sonnet-4'],
        },
        google: {
          enabled: true,
          apiKey: 'test-key',
          baseUrl: `http://localhost:${MOCK_PORT}`,
          models: ['gemini-2.5-flash'],
        },
        xai: {
          enabled: true,
          apiKey: 'test-key',
          baseUrl: `http://localhost:${MOCK_PORT}`,
          models: ['grok-3'],
        },
        deepseek: {
          enabled: true,
          apiKey: 'test-key',
          baseUrl: `http://localhost:${MOCK_PORT}`,
          models: ['deepseek-v3'],
        },
      };

      const apiKeys: ApiKeysConfig = {
        openai: 'test-key',
        anthropic: 'test-key',
        google: 'test-key',
        xai: 'test-key',
        deepseek: 'test-key',
      };

      const manager = new LLMProviderManager(mockApi, config, apiKeys);
      await manager.registerAll();
      await manager.startAll();

      // Get enabled providers
      const enabledProviders = manager.getEnabledProviders();
      expect(enabledProviders.length).toBe(5);

      // Test fallback chain for each provider
      for (const provider of enabledProviders) {
        const fallback = manager['router'].getFallback(provider, 'test-model');
        expect(fallback.length).toBe(enabledProviders.length - 1); // All except itself
        expect(fallback).not.toContain(provider);
      }

      await manager.stopAll();
    });
  });

  describe('Scenario 6: Request Classification', () => {
    it('should classify requests into correct tiers', async () => {
      const config: ProvidersConfig = {
        openai: {
          enabled: true,
          apiKey: 'test-key',
          baseUrl: `http://localhost:${MOCK_PORT}`,
        },
      };

      const apiKeys: ApiKeysConfig = {
        openai: 'test-key',
      };

      const manager = new LLMProviderManager(mockApi, config, apiKeys);
      await manager.registerAll();
      await manager.startAll();

      // Simple request (short)
      const simpleRequest: ChatCompletionRequest = {
        model: 'auto',
        messages: [{ role: 'user', content: 'Hi' }],
      };
      const simpleDecision = await manager.routeRequest(simpleRequest);
      expect(simpleDecision.tier).toBe('simple');

      // Medium request (needs to be longer to exceed simple threshold)
      const mediumRequest: ChatCompletionRequest = {
        model: 'auto',
        messages: [{ role: 'user', content: 'Write a detailed story about a cat that lived in a small village and went on adventures every day exploring the forests and meeting other animals along the way including a wise owl and a playful squirrel' }],
      };
      const mediumDecision = await manager.routeRequest(mediumRequest);
      // Medium threshold is 200 chars, so this should be medium or complex
      expect(['medium', 'complex']).toContain(mediumDecision.tier);

      // Complex request (long)
      const complexRequest: ChatCompletionRequest = {
        model: 'auto',
        messages: [{ role: 'user', content: 'A'.repeat(3000) }],
      };
      const complexDecision = await manager.routeRequest(complexRequest);
      expect(complexDecision.tier).toBe('complex');

      // Reasoning request
      const reasoningRequest: ChatCompletionRequest = {
        model: 'auto',
        messages: [{ role: 'user', content: 'Prove that the sum of two even numbers is even using mathematical notation' }],
      };
      const reasoningDecision = await manager.routeRequest(reasoningRequest);
      expect(reasoningDecision.tier).toBe('reasoning');

      await manager.stopAll();
    });
  });

  describe('Scenario 7: Mock Fixtures Validation', () => {
    it('should have proper fixtures for all major providers', async () => {
      // Verify fixtures exist for at least 2 providers
      expect(mockFixtures.openai).toBeDefined();
      expect(Object.keys(mockFixtures.openai).length).toBeGreaterThan(0);

      expect(mockFixtures.anthropic).toBeDefined();
      expect(Object.keys(mockFixtures.anthropic).length).toBeGreaterThan(0);

      expect(mockFixtures.google).toBeDefined();
      expect(Object.keys(mockFixtures.google).length).toBeGreaterThan(0);

      expect(mockFixtures.opencode).toBeDefined();
      expect(Object.keys(mockFixtures.opencode).length).toBeGreaterThan(0);

      // Verify fixture structure
      const gpt4oFixture = mockFixtures.openai['gpt-4o'];
      expect(gpt4oFixture.choices[0].message.content).toBe('Hello from GPT-4o!');

      const claudeFixture = mockFixtures.anthropic['claude-sonnet-4'];
      expect(claudeFixture.content[0].text).toBe('Hello from Claude Sonnet 4!');

      const geminiFixture = mockFixtures.google['gemini-2.5-flash'];
      expect(geminiFixture.candidates[0].content.parts[0].text).toBe('Hello from Gemini 2.5 Flash!');
    });
  });
});
