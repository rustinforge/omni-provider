/**
 * Smart Router Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SmartRouter } from '../../../src/router/smart-router.js';
import type { LLMProviderManager } from '../../../src/core/manager.js';

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
});
