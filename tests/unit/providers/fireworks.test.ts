/**
 * Fireworks Provider Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FireworksProvider } from '../../../src/providers/fireworks.js';

describe('FireworksProvider', () => {
  let provider: FireworksProvider;

  const testConfig = {
    enabled: true,
    apiKey: 'test-key',
    models: ['accounts/fireworks/models/llama-v3-70b-instruct', 'accounts/fireworks/models/llama-v3-8b-instruct'],
  };

  beforeEach(() => {
    provider = new FireworksProvider();
    (provider as any).initialized = true;
    (provider as any).config = testConfig;
  });

  it('should have correct provider name', () => {
    expect(provider.name).toBe('Fireworks');
  });

  it('should support Llama v3 70b model', () => {
    expect(provider.supportsModel('accounts/fireworks/models/llama-v3-70b-instruct')).toBe(true);
  });

  it('should support Llama v3 8b model', () => {
    expect(provider.supportsModel('accounts/fireworks/models/llama-v3-8b-instruct')).toBe(true);
  });

  it('should not support unknown models', () => {
    expect(provider.supportsModel('gpt-4o')).toBe(false);
    expect(provider.supportsModel('claude-opus-4')).toBe(false);
  });

  it('should return correct base URL', () => {
    expect(provider.getDefaultBaseUrl()).toBe('https://api.fireworks.ai/inference/v1');
  });

  it('should throw if not initialized', async () => {
    const uninitialized = new FireworksProvider();
    await expect(uninitialized.complete({
      model: 'accounts/fireworks/models/llama-v3-70b-instruct',
      messages: [{ role: 'user', content: 'Hello' }],
    })).rejects.toThrow('Not initialized');
  });
});
