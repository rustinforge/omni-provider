/**
 * E2E Tests - Full Routing Flow with Mock Server
 * 
 * Tests the complete flow from request to response through:
 * - Mock server simulating provider APIs
 * - Provider initialization
 * - Model resolution and routing
 * - Fallback chains
 * - Multiple provider scenarios
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { LLMProviderManager } from '../../src/core/manager.js';
import type { LLMProvider, ProvidersConfig, ApiKeysConfig, ChatCompletionRequest, ResolvedModel } from '../../src/types.js';

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
const MOCK_PORT = 3456;

// Mock responses for different providers - keyed by path pattern
const mockResponses: Record<string, { path: string; response: object }[]> = {
  '/v1/chat/completions': [
    { path: 'gpt-4o', response: {
      id: 'chatcmpl-gpt4o-test',
      object: 'chat.completion',
      created: Date.now(),
      model: 'gpt-4o',
      choices: [{
        index: 0,
        message: { role: 'assistant', content: 'Response from GPT-4o' },
        finish_reason: 'stop',
      }],
      usage: { prompt_tokens: 10, completion_tokens: 8, total_tokens: 18 },
    }},
    { path: 'grok-3', response: {
      id: 'chatcmpl-grok-test',
      object: 'chat.completion',
      created: Date.now(),
      model: 'grok-3',
      choices: [{
        index: 0,
        message: { role: 'assistant', content: 'Response from Grok' },
        finish_reason: 'stop',
      }],
      usage: { prompt_tokens: 10, completion_tokens: 8, total_tokens: 18 },
    }},
    { path: 'deepseek-v3', response: {
      id: 'chatcmpl-deepseek-test',
      object: 'chat.completion',
      created: Date.now(),
      model: 'deepseek-v3',
      choices: [{
        index: 0,
        message: { role: 'assistant', content: 'Response from DeepSeek' },
        finish_reason: 'stop',
      }],
      usage: { prompt_tokens: 10, completion_tokens: 8, total_tokens: 18 },
    }},
  ],
  '/v1/messages': [
    { path: 'claude', response: {
      id: 'msg_claude_test',
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: 'Response from Claude Sonnet' }],
      model: 'claude-sonnet-4-20250514',
      usage: { input_tokens: 10, output_tokens: 8 },
    }},
  ],
  '/v1/models': [
    { path: 'gemini', response: {
      candidates: [{
        content: { parts: [{ text: 'Response from Gemini Flash' }] },
        finishReason: 'STOP',
      }],
      usageMetadata: {
        promptTokenCount: 10,
        candidatesTokenCount: 8,
        totalTokenCount: 18,
      },
    }},
  ],
};

// Track which providers were called
let providerCalls: string[] = [];

// Create mock server
function createMockServer(): http.Server {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://localhost:${MOCK_PORT}`);
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    let body = '';
    if (['POST', 'PUT'].includes(req.method || '')) {
      for await (const chunk of req) {
        body += chunk;
      }
    }

    // Handle OpenAI-style chat completions
    if (url.pathname === '/v1/chat/completions') {
      try {
        const data = JSON.parse(body);
        const model = data.model || 'gpt-4o';
        
        // Track provider call
        providerCalls.push(model);
        
        // Find matching mock response
        const responses = mockResponses['/v1/chat/completions'] || [];
        const match = responses.find(r => model.includes(r.path)) || responses[0];
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(match.response));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
      return;
    }

    // Handle Anthropic messages
    if (url.pathname === '/v1/messages') {
      providerCalls.push('claude');
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(mockResponses['/v1/messages'][0].response));
      return;
    }

    // Handle Google Gemini (generativelanguage.googleapis.com)
    if (url.pathname.includes('/models/') && url.pathname.includes(':generateContent')) {
      providerCalls.push('gemini');
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(mockResponses['/v1/models'][0].response));
      return;
    }

    // Health check
    if (url.pathname === '/health') {
      res.writeHead(200);
      res.end('OK');
      return;
    }

    // Default: return generic success for health check style requests
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
  });

  return server;
}

describe('E2E Tests - Full Routing Flow', () => {
  let mockServer: http.Server;

  beforeAll(async () => {
    // Start mock server
    mockServer = createMockServer();
    await new Promise<void>((resolve) => {
      mockServer.listen(MOCK_PORT, () => {
        console.log(`Mock server running on port ${MOCK_PORT}`);
        resolve();
      });
    });
  });

  afterAll(async () => {
    // Stop mock server
    await new Promise<void>((resolve) => {
      mockServer.close(() => resolve());
    });
  });

  describe('Scenario 1: Single Provider Flow', () => {
    it('should configure and initialize single provider correctly', async () => {
      providerCalls = [];

      // Create config with single provider pointing to mock server
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

      // Verify provider is registered and available
      const providers = manager.getAllProviders();
      expect(providers.has('openai')).toBe(true);
      
      // Verify model resolution works
      const resolved = await manager.resolveModel('gpt-4o');
      expect(resolved.provider).toBe('openai');
      expect(resolved.modelId).toBe('gpt-4o');

      // Verify provider is available
      expect(manager.isProviderAvailable('openai')).toBe(true);

      await manager.stopAll();
    });
  });

  describe('Scenario 2: Multi-Provider Routing', () => {
    it('should route to correct provider based on model', async () => {
      providerCalls = [];

      // Create config with multiple providers
      const config: ProvidersConfig = {
        openai: {
          enabled: true,
          apiKey: 'test-key',
          baseUrl: `http://localhost:${MOCK_PORT}`,
          models: ['gpt-4o', 'grok-3', 'deepseek-v3'],
        },
        anthropic: {
          enabled: true,
          apiKey: 'test-key',
          baseUrl: `http://localhost:${MOCK_PORT}`,
          models: ['claude-sonnet-4'],
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
        xai: 'test-key',
        deepseek: 'test-key',
      };

      const manager = new LLMProviderManager(mockApi, config, apiKeys);
      await manager.registerAll();
      await manager.startAll();

      // Test OpenAI model resolution
      const gpt4oResolved = await manager.resolveModel('gpt-4o');
      expect(gpt4oResolved.provider).toBe('openai');
      expect(gpt4oResolved.modelId).toBe('gpt-4o');

      // Test xai model resolution (grok-3)
      const grokResolved = await manager.resolveModel('grok-3');
      expect(grokResolved.provider).toBe('xai');
      expect(grokResolved.modelId).toBe('grok-3');

      // Test deepseek model resolution (deepseek-v3)
      const deepseekResolved = await manager.resolveModel('deepseek-v3');
      expect(deepseekResolved.provider).toBe('deepseek');
      expect(deepseekResolved.modelId).toBe('deepseek-v3');

      // Test anthropic model resolution
      const claudeResolved = await manager.resolveModel('claude-sonnet-4');
      expect(claudeResolved.provider).toBe('anthropic');
      expect(claudeResolved.modelId).toBe('claude-sonnet-4');

      await manager.stopAll();
    });
  });

  describe('Scenario 3: Fallback Chain', () => {
    it('should have fallback chain available when primary fails', async () => {
      providerCalls = [];

      // Create config with multiple providers
      const config: ProvidersConfig = {
        openai: {
          enabled: true,
          apiKey: 'test-key',
          baseUrl: `http://localhost:${MOCK_PORT}`,
          models: ['gpt-4o'],
        },
        xai: {
          enabled: true,
          apiKey: 'test-key',
          baseUrl: `http://localhost:${MOCK_PORT}`,
          models: ['grok-3'],
        },
      };

      const apiKeys: ApiKeysConfig = {
        openai: 'test-key',
        xai: 'test-key',
      };

      const manager = new LLMProviderManager(mockApi, config, apiKeys);
      await manager.registerAll();
      await manager.startAll();

      // Test model resolution
      const resolved = await manager.resolveModel('gpt-4o');
      expect(resolved).toBeDefined();
      expect(resolved.provider).toBe('openai');

      // Test getEnabledProviders
      const enabled = manager.getEnabledProviders();
      expect(enabled).toContain('openai');
      expect(enabled).toContain('xai');

      // Test getFallback
      const fallback = manager['router'].getFallback('openai', 'gpt-4o');
      expect(fallback).toBeDefined();
      expect(fallback).toContain('xai');

      await manager.stopAll();
    });

    it('should check provider availability correctly', async () => {
      const config: ProvidersConfig = {
        openai: {
          enabled: true,
          apiKey: 'test-key',
          baseUrl: `http://localhost:${MOCK_PORT}`,
        },
        anthropic: {
          enabled: false, // Disabled
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

      // OpenAI should be available
      expect(manager.isProviderAvailable('openai')).toBe(true);

      // Anthropic should not be available (disabled)
      expect(manager.isProviderAvailable('anthropic')).toBe(false);

      await manager.stopAll();
    });
  });

  describe('Scenario 4: Auto Routing', () => {
    it('should route auto to first available provider', async () => {
      providerCalls = [];

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
      };

      const apiKeys: ApiKeysConfig = {
        openai: 'test-key',
        anthropic: 'test-key',
      };

      const manager = new LLMProviderManager(mockApi, config, apiKeys);
      await manager.registerAll();
      await manager.startAll();

      // Test auto routing
      const resolved = await manager.resolveModel('omni-llm/auto');
      expect(resolved).toBeDefined();
      // Should route to first available provider
      expect(['openai', 'anthropic']).toContain(resolved.provider);

      await manager.stopAll();
    });

    it('should route based on request characteristics', async () => {
      const config: ProvidersConfig = {
        openai: {
          enabled: true,
          apiKey: 'test-key',
          baseUrl: `http://localhost:${MOCK_PORT}`,
          models: ['gpt-4o'],
        },
        xai: {
          enabled: true,
          apiKey: 'test-key',
          baseUrl: `http://localhost:${MOCK_PORT}`,
          models: ['grok-3'],
        },
      };

      const apiKeys: ApiKeysConfig = {
        openai: 'test-key',
        xai: 'test-key',
      };

      const manager = new LLMProviderManager(mockApi, config, apiKeys);
      await manager.registerAll();
      await manager.startAll();

      // Simple request (short)
      const simpleRequest: ChatCompletionRequest = {
        model: 'auto',
        messages: [{ role: 'user', content: 'Hi' }],
      };

      const decision = await manager.routeRequest(simpleRequest);
      expect(decision).toBeDefined();
      expect(decision.tier).toBe('simple');

      // Complex request (long)
      const complexRequest: ChatCompletionRequest = {
        model: 'auto',
        messages: [{ role: 'user', content: 'A'.repeat(3000) }],
      };

      const complexDecision = await manager.routeRequest(complexRequest);
      expect(complexDecision).toBeDefined();
      expect(complexDecision.tier).toBe('complex');

      // Reasoning request
      const reasoningRequest: ChatCompletionRequest = {
        model: 'auto',
        messages: [{ role: 'user', content: 'Prove that the sum of two even numbers is even' }],
      };

      const reasoningDecision = await manager.routeRequest(reasoningRequest);
      expect(reasoningDecision).toBeDefined();
      expect(reasoningDecision.tier).toBe('reasoning');

      await manager.stopAll();
    });
  });

  describe('Scenario 5: Provider Registration', () => {
    it('should register all enabled providers', async () => {
      const config: ProvidersConfig = {
        openai: { enabled: true, apiKey: 'test-key' },
        anthropic: { enabled: true, apiKey: 'test-key' },
        google: { enabled: true, apiKey: 'test-key' },
        xai: { enabled: true, apiKey: 'test-key' },
        deepseek: { enabled: true, apiKey: 'test-key' },
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

      const providers = manager.getAllProviders();
      expect(providers.size).toBe(5);
      expect(providers.has('openai')).toBe(true);
      expect(providers.has('anthropic')).toBe(true);
      expect(providers.has('google')).toBe(true);
      expect(providers.has('xai')).toBe(true);
      expect(providers.has('deepseek')).toBe(true);

      await manager.stopAll();
    });

    it('should throw when registering unknown provider', async () => {
      const config: ProvidersConfig = {
        unknown: { enabled: true, apiKey: 'test-key' },
      };

      const apiKeys: ApiKeysConfig = {};

      const manager = new LLMProviderManager(mockApi, config, apiKeys);
      
      await expect(manager.registerAll()).rejects.toThrow('No provider implementation');
    });
  });

  describe('Scenario 6: Model Resolution', () => {
    it('should resolve known models to correct providers', async () => {
      const config: ProvidersConfig = {
        openai: { enabled: true, apiKey: 'test-key' },
        anthropic: { enabled: true, apiKey: 'test-key' },
        google: { enabled: true, apiKey: 'test-key' },
        opencode: { enabled: true, apiKey: 'test-key' },
      };

      const apiKeys: ApiKeysConfig = {
        openai: 'test-key',
        anthropic: 'test-key',
        google: 'test-key',
        opencode: 'test-key',
      };

      const manager = new LLMProviderManager(mockApi, config, apiKeys);
      await manager.registerAll();
      await manager.startAll();

      // Test known model resolution
      const gpt4o = await manager.resolveModel('gpt-4o');
      expect(gpt4o.provider).toBe('openai');
      expect(gpt4o.modelId).toBe('gpt-4o');

      const claude = await manager.resolveModel('claude-sonnet-4');
      expect(claude.provider).toBe('anthropic');

      const gemini = await manager.resolveModel('gemini-2.5-flash');
      expect(gemini.provider).toBe('google');

      const opencode = await manager.resolveModel('big-pickle');
      expect(opencode.provider).toBe('opencode');

      await manager.stopAll();
    });

    it('should handle model aliases', async () => {
      const config: ProvidersConfig = {
        openai: { enabled: true, apiKey: 'test-key' },
        anthropic: { enabled: true, apiKey: 'test-key' },
      };

      const apiKeys: ApiKeysConfig = {
        openai: 'test-key',
        anthropic: 'test-key',
      };

      const manager = new LLMProviderManager(mockApi, config, apiKeys);
      await manager.registerAll();
      await manager.startAll();

      // Test aliases
      const gpt = await manager.resolveModel('gpt');
      expect(gpt.modelId).toBe('gpt-4o');

      const sonnet = await manager.resolveModel('sonnet');
      expect(sonnet.modelId).toBe('claude-sonnet-4');

      await manager.stopAll();
    });
  });
});
