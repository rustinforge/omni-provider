/**
 * Routing Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SmartRouter } from '../../src/router/smart-router.js';
import { LLMProviderManager } from '../../src/core/manager.js';

describe('Routing Integration', () => {
  let manager: LLMProviderManager;
  let router: SmartRouter;

  beforeEach(() => {
    manager = new LLMProviderManager({
      opencode: { enabled: true, apiKey: 'test-key' },
      openai: { enabled: true, apiKey: 'test-key' },
      anthropic: { enabled: true, apiKey: 'test-key' },
      google: { enabled: true, apiKey: 'test-key' },
      deepseek: { enabled: true, apiKey: 'test-key' },
      xai: { enabled: true, apiKey: 'test-key' },
      openrouter: { enabled: true, apiKey: 'test-key' },
    });
    router = new SmartRouter(manager);
  });

  it('should initialize with multiple providers', () => {
    const providers = manager.getEnabledProviders();
    expect(providers.length).toBeGreaterThan(0);
  });

  it('should route to opencode when available', async () => {
    const result = await router.routeAuto();
    expect(result.provider).toBe('opencode');
  });

  it('should provide fallback chain', () => {
    const fallbacks = router.getFallback('opencode', 'big-pickle');
    expect(fallbacks.length).toBeGreaterThan(0);
  });

  it('should classify and route requests end-to-end', async () => {
    const decision = await router.decide({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Write a haiku' }],
    });

    expect(decision.provider).toBeDefined();
    expect(decision.model).toBeDefined();
    expect(decision.tier).toBeDefined();
    expect(decision.reasoning).toBeDefined();
  });

  it('should handle reasoning requests', async () => {
    const decision = await router.decide({
      model: 'o1',
      messages: [{ role: 'user', content: 'Solve this logic puzzle: All roses are flowers. Some flowers fade quickly. Do some roses fade quickly?' }],
    });

    expect(decision.tier).toBe('reasoning');
    expect(decision.fallbackChain.length).toBeGreaterThan(0);
  });

  it('should route through fallback chain when primary fails', async () => {
    const fallbacks = router.getFallback('opencode', 'big-pickle');
    
    // Should have multiple fallbacks
    expect(fallbacks.length).toBeGreaterThanOrEqual(1);
    
    // Fallbacks should be different from primary
    expect(fallbacks).not.toContain('opencode');
  });
});

describe('Provider Availability', () => {
  let manager: LLMProviderManager;

  it('should report opencode as available when enabled', () => {
    manager = new LLMProviderManager({
      opencode: { enabled: true, apiKey: 'test' },
    });
    expect(manager.isProviderAvailable('opencode')).toBe(true);
  });

  it('should report provider as unavailable when disabled', () => {
    manager = new LLMProviderManager({
      opencode: { enabled: false, apiKey: 'test' },
    });
    expect(manager.isProviderAvailable('opencode')).toBe(false);
  });

  it('should report provider as unavailable when no config', () => {
    manager = new LLMProviderManager({});
    expect(manager.isProviderAvailable('opencode')).toBe(false);
  });

  it('should get list of enabled providers', () => {
    manager = new LLMProviderManager({
      opencode: { enabled: true, apiKey: 'test' },
      openai: { enabled: true, apiKey: 'test' },
      anthropic: { enabled: false, apiKey: 'test' },
    });
    const providers = manager.getEnabledProviders();
    expect(providers).toContain('opencode');
    expect(providers).toContain('openai');
    expect(providers).not.toContain('anthropic');
  });
});
