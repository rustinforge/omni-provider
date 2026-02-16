/**
 * Smart Router Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SmartRouter } from '../../../src/router/smart-router.js';
import type { LLMProviderManager } from '../../../src/core/manager.js';
import type { ChatCompletionRequest } from '../../../src/types.js';

describe('SmartRouter', () => {
  let router: SmartRouter;
  let mockManager: Partial<LLMProviderManager>;

  beforeEach(() => {
    mockManager = {
      isProviderAvailable: vi.fn().mockReturnValue(true),
      getEnabledProviders: vi.fn().mockReturnValue(['opencode', 'openai', 'google']),
    };
    router = new SmartRouter(mockManager as LLMProviderManager);
  });

  it('should have correct default tier', () => {
    expect(router).toBeDefined();
  });

  it('should classify simple requests correctly', async () => {
    const result = await router.decide({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
    });
    expect(result).toBeDefined();
    expect(result.tier).toBeDefined();
  });

  it('should classify reasoning requests', async () => {
    const result = await router.decide({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Prove that the sum of two even numbers is even' }],
    });
    expect(result.tier).toBe('reasoning');
  });

  it('should prefer opencode for free models', async () => {
    const result = await router.routeAuto();
    expect(result.provider).toBe('opencode');
  });

  it('should return fallback chain', () => {
    const fallbacks = router.getFallback('opencode', 'big-pickle');
    expect(fallbacks).toContain('openai');
    expect(fallbacks).toContain('google');
  });

  it('should classify short requests as simple', async () => {
    const result = await router.decide({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hi' }],
    });
    expect(result.tier).toBe('simple');
  });

  it('should classify long requests as complex', async () => {
    const longContent = 'A'.repeat(3000);
    const result = await router.decide({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: longContent }],
    });
    expect(result.tier).toBe('complex');
  });

  it('should include fallback chain in decision', async () => {
    const result = await router.decide({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
    });
    expect(result.fallbackChain).toBeDefined();
    expect(Array.isArray(result.fallbackChain)).toBe(true);
  });

  it('should provide cost estimate in decision', async () => {
    const result = await router.decide({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
    });
    expect(typeof result.costEstimate).toBe('number');
  });

  it('should provide savings estimate in decision', async () => {
    const result = await router.decide({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
    });
    expect(typeof result.savings).toBe('number');
  });

  it('should handle reasoning keywords in content', async () => {
    const reasoningRequests: ChatCompletionRequest[] = [
      { model: 'test', messages: [{ role: 'user', content: 'Calculate 2+2' }] },
      { model: 'test', messages: [{ role: 'user', content: 'Explain step by step how photosynthesis works' }] },
      { model: 'test', messages: [{ role: 'user', content: 'Derive the quadratic formula' }] },
      { model: 'test', messages: [{ role: 'user', content: 'Prove Fermat\'s little theorem' }] },
    ];

    for (const req of reasoningRequests) {
      const result = await router.decide(req);
      expect(result.tier).toBe('reasoning');
    }
  });

  it('should throw error when no providers available', () => {
    const emptyManager = {
      isProviderAvailable: vi.fn().mockReturnValue(false),
      getEnabledProviders: vi.fn().mockReturnValue([]),
    };
    const emptyRouter = new SmartRouter(emptyManager as any);
    
    expect(emptyRouter.routeAuto()).rejects.toThrow('No LLM providers configured');
  });
});
