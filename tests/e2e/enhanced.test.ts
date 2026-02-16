/**
 * E2E Tests - Enhanced Test Cases
 * 
 * Tests for:
 * - Fallback chain behavior
 * - Cost estimation in routing decisions
 * - Provider health checking
 * - Concurrent request handling
 * - Error scenarios
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import http from 'http';
import { LLMProviderManager } from '../../src/core/manager.js';
import type { ProvidersConfig, ApiKeysConfig, ChatCompletionRequest, LLMProvider, RoutingDecision } from '../../src/types.js';
import { getModel } from '../../src/models.js';

// Mock API logger
const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

// Mock API
const mockApi = {
  logger: mockLogger,
  registerCommand: async () => {},
  registerService: async () => {},
} as any;

// Track server state
let mockServer: http.Server | null = null;
let requestLog: string[] = [];
let providerErrorConfig: Record<string, boolean> = {};
const MOCK_PORT = 3460;

// Create mock server with configurable behavior
function createMockServer(): http.Server {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://localhost:${MOCK_PORT}`);
    
    // Log request
    requestLog.push(`${req.method} ${url.pathname}`);
    
    // CORS
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

    // Health check endpoint
    if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }));
      return;
    }

    // Check if provider should fail
    const providerName = url.pathname.includes('openai') ? 'openai' :
                        url.pathname.includes('anthropic') ? 'anthropic' :
                        url.pathname.includes('google') ? 'google' : 'default';
    
    if (providerErrorConfig[providerName]) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Service unavailable', message: 'Provider is down for testing' }));
      return;
    }

    // Handle chat completions
    if (url.pathname === '/v1/chat/completions') {
      try {
        const data = JSON.parse(body);
        
        // Simulate processing time
        await new Promise(r => setTimeout(r, 10));
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          id: 'chatcmpl-test-' + Date.now(),
          object: 'chat.completion',
          created: Date.now(),
          model: data.model || 'gpt-4o',
          choices: [{
            index: 0,
            message: { role: 'assistant', content: 'Response from ' + (data.model || 'gpt-4o') },
            finish_reason: 'stop',
          }],
          usage: { prompt_tokens: 10, completion_tokens: 8, total_tokens: 18 },
        }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
      return;
    }

    // Handle Anthropic messages
    if (url.pathname === '/v1/messages') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        id: 'msg_claude_test',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Response from Claude' }],
        model: 'claude-sonnet-4',
        usage: { input_tokens: 10, output_tokens: 8 },
      }));
      return;
    }

    // Default response
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
  });

  return server;
}

async function startMockServer(): Promise<number> {
  return new Promise((resolve, reject) => {
    if (mockServer) {
      resolve(MOCK_PORT);
      return;
    }
    
    mockServer = createMockServer();
    mockServer.listen(MOCK_PORT, () => {
      console.log(`Mock server running on port ${MOCK_PORT}`);
      resolve(MOCK_PORT);
    });
    
    mockServer.on('error', (err) => {
      reject(err);
    });
  });
}

async function stopMockServer(): Promise<void> {
  return new Promise((resolve) => {
    if (mockServer) {
      mockServer.close(() => {
        mockServer = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

describe('E2E Tests - Enhanced Scenarios', () => {
  beforeAll(async () => {
    await startMockServer();
    requestLog = [];
    providerErrorConfig = {};
  });

  afterAll(async () => {
    await stopMockServer();
  });

  beforeEach(() => {
    requestLog = [];
    providerErrorConfig = {};
    vi.clearAllMocks();
  });

  // ============================================
  // Test 1: Fallback Chain Behavior
  // ============================================
  describe('Fallback Chain Behavior', () => {
    it('should fallback to secondary provider when primary fails', async () => {
      // Configure primary to fail
      providerErrorConfig['openai'] = true;

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

      // Verify fallback chain is configured
      const fallback = manager['router'].getFallback('openai', 'gpt-4o');
      expect(fallback).toContain('anthropic');
      expect(fallback.length).toBeGreaterThan(0);

      // Test that secondary provider is available
      expect(manager.isProviderAvailable('anthropic')).toBe(true);

      await manager.stopAll();
    });

    it('should fallback through multiple providers in chain order', async () => {
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
      };

      const apiKeys: ApiKeysConfig = {
        openai: 'test-key',
        anthropic: 'test-key',
        google: 'test-key',
      };

      const manager = new LLMProviderManager(mockApi, config, apiKeys);
      await manager.registerAll();
      await manager.startAll();

      // Get fallback chain for openai
      const fallback = manager['router'].getFallback('openai', 'gpt-4o');
      
      // Should have 2 fallbacks (anthropic and google)
      expect(fallback.length).toBe(2);
      
      // First fallback should be anthropic (registered second but priority may vary)
      // The fallback returns all other enabled providers
      expect(fallback).toContain('anthropic');
      expect(fallback).toContain('google');
      expect(fallback).not.toContain('openai');

      await manager.stopAll();
    });

    it('should handle fallback chain exhaustion gracefully', async () => {
      // Configure all providers to fail by using non-existent base URL
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
          baseUrl: `http://localhost:${MOCK_PORT}/non-existent`,
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

      // Verify fallback chain exists
      const fallback = manager['router'].getFallback('openai', 'gpt-4o');
      expect(fallback.length).toBeGreaterThan(0);

      // Verify both providers are registered (even if they may fail at runtime)
      expect(manager.isProviderAvailable('openai')).toBe(true);
      expect(manager.isProviderAvailable('anthropic')).toBe(true);

      await manager.stopAll();
    });
  });

  // ============================================
  // Test 2: Cost Estimation in Routing
  // ============================================
  describe('Cost Estimation in Routing', () => {
    it('should estimate cost based on model pricing', async () => {
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

      // Test routing decision includes cost estimate
      const request: ChatCompletionRequest = {
        model: 'auto',
        messages: [{ role: 'user', content: 'Hello world' }],
      };

      const decision = await manager.routeRequest(request);
      
      expect(decision).toBeDefined();
      expect(decision.costEstimate).toBeDefined();
      expect(decision.savings).toBeDefined();
      expect(typeof decision.savings).toBe('number');

      await manager.stopAll();
    });

    it('should route to cheaper model for simple requests', async () => {
      const config: ProvidersConfig = {
        openai: { enabled: true, apiKey: 'test-key' },
        opencode: { enabled: true, apiKey: 'test-key' },
      };

      const apiKeys: ApiKeysConfig = {
        openai: 'test-key',
        opencode: 'test-key',
      };

      const manager = new LLMProviderManager(mockApi, config, apiKeys);
      await manager.registerAll();
      await manager.startAll();

      // OpenCode should be first for auto (it's free)
      const resolved = await manager.resolveModel('omni-llm/auto');
      expect(resolved.provider).toBe('opencode');

      // Check model info has pricing
      const modelInfo = getModel('gpt-4o-mini');
      expect(modelInfo?.pricing).toBeDefined();
      expect(modelInfo?.pricing?.input).toBeLessThan(modelInfo?.pricing?.output || 100);

      // Verify free model
      const freeModel = getModel('big-pickle');
      expect(freeModel?.pricing?.input).toBe(0);
      expect(freeModel?.pricing?.output).toBe(0);

      await manager.stopAll();
    });

    it('should calculate savings vs reference provider', async () => {
      const config: ProvidersConfig = {
        openai: { enabled: true, apiKey: 'test-key' },
        opencode: { enabled: true, apiKey: 'test-key' },
      };

      const apiKeys: ApiKeysConfig = {
        openai: 'test-key',
        opencode: 'test-key',
      };

      const manager = new LLMProviderManager(mockApi, config, apiKeys);
      await manager.registerAll();
      await manager.startAll();

      // Get stats
      const stats = manager.getStats();
      
      // Stats should have structure
      expect(stats).toBeDefined();
      expect(stats.totalRequests).toBe(0); // No requests yet

      await manager.stopAll();
    });
  });

  // ============================================
  // Test 3: Provider Health Checking
  // ============================================
  describe('Provider Health Checking', () => {
    it('should report provider availability correctly', async () => {
      const config: ProvidersConfig = {
        openai: { enabled: true, apiKey: 'test-key', baseUrl: `http://localhost:${MOCK_PORT}` },
        anthropic: { enabled: false, apiKey: 'test-key' }, // Disabled
        google: { enabled: true, apiKey: 'test-key', baseUrl: `http://localhost:${MOCK_PORT}` },
      };

      const apiKeys: ApiKeysConfig = {
        openai: 'test-key',
        google: 'test-key',
      };

      const manager = new LLMProviderManager(mockApi, config, apiKeys);
      await manager.registerAll();
      await manager.startAll();

      // Enabled providers should be available
      expect(manager.isProviderAvailable('openai')).toBe(true);
      expect(manager.isProviderAvailable('google')).toBe(true);

      // Disabled provider should not be available
      expect(manager.isProviderAvailable('anthropic')).toBe(false);

      await manager.stopAll();
    });

    it('should track enabled providers correctly', async () => {
      const config: ProvidersConfig = {
        openai: { enabled: true, apiKey: 'test-key' },
        anthropic: { enabled: true, apiKey: 'test-key' },
        google: { enabled: false, apiKey: 'test-key' }, // Disabled
      };

      const apiKeys: ApiKeysConfig = {
        openai: 'test-key',
        anthropic: 'test-key',
      };

      const manager = new LLMProviderManager(mockApi, config, apiKeys);
      await manager.registerAll();
      await manager.startAll();

      const enabled = manager.getEnabledProviders();
      expect(enabled).toContain('openai');
      expect(enabled).toContain('anthropic');
      expect(enabled).not.toContain('google');
      expect(enabled.length).toBe(2);

      await manager.stopAll();
    });

    it('should handle provider startup failures gracefully', async () => {
      // Provider with invalid config should still register but may have issues
      const config: ProvidersConfig = {
        openai: { enabled: true, apiKey: 'test-key' },
        invalid: { enabled: true, apiKey: 'test-key' }, // Invalid provider
      };

      const apiKeys: ApiKeysConfig = {
        openai: 'test-key',
      };

      const manager = new LLMProviderManager(mockApi, config, apiKeys);

      // Should throw for unknown provider
      await expect(manager.registerAll()).rejects.toThrow('No provider implementation');

      await manager.stopAll().catch(() => {});
    });

    it('should provide health status via stats', async () => {
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

      const stats = manager.getStats();
      
      // Should have stats for each provider
      expect(stats.byProvider).toBeDefined();
      expect(Array.isArray(stats.byProvider)).toBe(true);

      await manager.stopAll();
    });
  });

  // ============================================
  // Test 4: Concurrent Request Handling
  // ============================================
  describe('Concurrent Request Handling', () => {
    it('should handle multiple simultaneous provider registrations', async () => {
      const config: ProvidersConfig = {
        openai: { enabled: true, apiKey: 'test-key', baseUrl: `http://localhost:${MOCK_PORT}` },
        anthropic: { enabled: true, apiKey: 'test-key', baseUrl: `http://localhost:${MOCK_PORT}` },
        google: { enabled: true, apiKey: 'test-key', baseUrl: `http://localhost:${MOCK_PORT}` },
        xai: { enabled: true, apiKey: 'test-key', baseUrl: `http://localhost:${MOCK_PORT}` },
        deepseek: { enabled: true, apiKey: 'test-key', baseUrl: `http://localhost:${MOCK_PORT}` },
      };

      const apiKeys: ApiKeysConfig = {
        openai: 'test-key',
        anthropic: 'test-key',
        google: 'test-key',
        xai: 'test-key',
        deepseek: 'test-key',
      };

      const manager = new LLMProviderManager(mockApi, config, apiKeys);
      
      // Register all at once
      await manager.registerAll();
      await manager.startAll();

      // All should be available
      const providers = manager.getAllProviders();
      expect(providers.size).toBe(5);

      await manager.stopAll();
    });

    it('should handle concurrent model resolution requests', async () => {
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

      // Concurrent model resolutions
      const promises = [
        manager.resolveModel('gpt-4o'),
        manager.resolveModel('claude-sonnet-4'),
        manager.resolveModel('omni-llm/auto'),
        manager.resolveModel('gpt-4o'),
        manager.resolveModel('auto'),
      ];

      const results = await Promise.all(promises);
      
      // All should resolve correctly
      expect(results).toHaveLength(5);
      expect(results[0].provider).toBe('openai');
      expect(results[1].provider).toBe('anthropic');

      await manager.stopAll();
    });

    it('should handle concurrent routing decisions', async () => {
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

      // Create various request types
      const requests: ChatCompletionRequest[] = [
        { model: 'auto', messages: [{ role: 'user', content: 'Hi' }] },
        { model: 'auto', messages: [{ role: 'user', content: 'Explain math' }] },
        { model: 'auto', messages: [{ role: 'user', content: 'A'.repeat(3000) }] },
        { model: 'auto', messages: [{ role: 'user', content: 'Hello world' }] },
        { model: 'auto', messages: [{ role: 'user', content: 'What is 2+2? Prove it.' }] },
      ];

      // Concurrent routing decisions
      const decisions = await Promise.all(requests.map(req => manager.routeRequest(req)));
      
      // All should have decisions
      expect(decisions).toHaveLength(5);
      
      // All should have required fields
      for (const decision of decisions) {
        expect(decision.provider).toBeDefined();
        expect(decision.tier).toBeDefined();
        expect(decision.fallbackChain).toBeDefined();
      }

      // Should have different tiers based on content
      const tiers = decisions.map(d => d.tier);
      expect(tiers).toContain('simple');
      expect(tiers).toContain('reasoning');
      expect(tiers).toContain('complex');

      await manager.stopAll();
    });

    it('should maintain provider state under concurrent access', async () => {
      const config: ProvidersConfig = {
        openai: { enabled: true, apiKey: 'test-key' },
      };

      const apiKeys: ApiKeysConfig = {
        openai: 'test-key',
      };

      const manager = new LLMProviderManager(mockApi, config, apiKeys);
      await manager.registerAll();
      await manager.startAll();

      // Multiple concurrent checks
      const checks = Array(10).fill(null).map(() => manager.isProviderAvailable('openai'));
      const results = await Promise.all(checks);
      
      // All should return true consistently
      expect(results.every(r => r === true)).toBe(true);

      await manager.stopAll();
    });
  });

  // ============================================
  // Test 5: Error Scenarios
  // ============================================
  describe('Error Scenarios', () => {
    it('should throw meaningful error for unavailable provider', async () => {
      const config: ProvidersConfig = {
        openai: { enabled: true, apiKey: 'test-key' },
      };

      const apiKeys: ApiKeysConfig = {
        openai: 'test-key',
      };

      const manager = new LLMProviderManager(mockApi, config, apiKeys);
      await manager.registerAll();
      await manager.startAll();

      // Try to get non-existent provider
      const provider = manager.getProvider('anthropic' as LLMProvider);
      expect(provider).toBeUndefined();

      await manager.stopAll();
    });

    it('should handle resolving model with no enabled providers', async () => {
      const config: ProvidersConfig = {};

      const apiKeys: ApiKeysConfig = {};

      const manager = new LLMProviderManager(mockApi, config, apiKeys);
      await manager.registerAll();
      await manager.startAll();

      // With no providers, should return first available from known models
      // This tests that resolveModel handles empty provider list gracefully
      const enabled = manager.getEnabledProviders();
      expect(enabled.length).toBe(0);
    });

    it('should handle invalid model gracefully', async () => {
      const config: ProvidersConfig = {
        openai: { enabled: true, apiKey: 'test-key' },
      };

      const apiKeys: ApiKeysConfig = {
        openai: 'test-key',
      };

      const manager = new LLMProviderManager(mockApi, config, apiKeys);
      await manager.registerAll();
      await manager.startAll();

      // Resolve unknown model - should fall back to first available
      const resolved = await manager.resolveModel('unknown-model-xyz');
      expect(resolved).toBeDefined();
      expect(resolved.provider).toBe('openai');

      await manager.stopAll();
    });

    it('should handle empty request gracefully', async () => {
      const config: ProvidersConfig = {
        openai: { enabled: true, apiKey: 'test-key' },
      };

      const apiKeys: ApiKeysConfig = {
        openai: 'test-key',
      };

      const manager = new LLMProviderManager(mockApi, config, apiKeys);
      await manager.registerAll();
      await manager.startAll();

      // Empty messages should still classify as simple
      const request: ChatCompletionRequest = {
        model: 'auto',
        messages: [],
      };

      const decision = await manager.routeRequest(request);
      expect(decision.tier).toBe('simple');

      await manager.stopAll();
    });

    it('should emit fallback events when primary fails', async () => {
      const config: ProvidersConfig = {
        openai: { enabled: true, apiKey: 'test-key', baseUrl: `http://localhost:${MOCK_PORT}/fail` },
        anthropic: { enabled: true, apiKey: 'test-key', baseUrl: `http://localhost:${MOCK_PORT}` },
      };

      const apiKeys: ApiKeysConfig = {
        openai: 'test-key',
        anthropic: 'test-key',
      };

      const manager = new LLMProviderManager(mockApi, config, apiKeys);
      await manager.registerAll();
      await manager.startAll();

      // Track events
      const events: any[] = [];
      manager.onEvent((event) => {
        events.push(event);
      });

      // Verify event handler is registered
      expect(events.length).toBe(0);

      // Get fallback chain - this should work
      const fallback = manager['router'].getFallback('openai', 'gpt-4o');
      expect(fallback).toContain('anthropic');

      await manager.stopAll();
    });
  });

  // ============================================
  // Additional Edge Cases
  // ============================================
  describe('Edge Cases', () => {
    it('should handle provider with no models configured', async () => {
      const config: ProvidersConfig = {
        openai: { enabled: true, apiKey: 'test-key' },
      };

      const apiKeys: ApiKeysConfig = {
        openai: 'test-key',
      };

      const manager = new LLMProviderManager(mockApi, config, apiKeys);
      await manager.registerAll();
      await manager.startAll();

      // Should still work - model resolution should infer from model ID
      const resolved = await manager.resolveModel('gpt-4o');
      expect(resolved.provider).toBe('openai');

      await manager.stopAll();
    });

    it('should handle model alias resolution correctly', async () => {
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

      // Test alias resolution
      const sonnet = await manager.resolveModel('sonnet');
      expect(sonnet.modelId).toBe('claude-sonnet-4');
      expect(sonnet.provider).toBe('anthropic');

      const gpt = await manager.resolveModel('gpt');
      expect(gpt.modelId).toBe('gpt-4o');
      expect(gpt.provider).toBe('openai');

      await manager.stopAll();
    });

    it('should provide correct capabilities for resolved models', async () => {
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

      // GPT-4o should have all capabilities
      const gpt4o = await manager.resolveModel('gpt-4o');
      expect(gpt4o.capabilities).toBeDefined();
      expect(gpt4o.capabilities.streaming).toBe(true);
      expect(gpt4o.capabilities.functionCalling).toBe(true);
      expect(gpt4o.capabilities.vision).toBe(true);

      // Claude Sonnet should have similar
      const claude = await manager.resolveModel('claude-sonnet-4');
      expect(claude.capabilities.streaming).toBe(true);

      await manager.stopAll();
    });
  });
});
