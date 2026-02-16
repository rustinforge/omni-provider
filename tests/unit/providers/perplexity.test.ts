/**
 * Perplexity Provider Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PerplexityProvider } from '../../../src/providers/perplexity.js';

describe('PerplexityProvider', () => {
  let provider: PerplexityProvider;

  const testConfig = {
    enabled: true,
    apiKey: 'test-key',
    models: ['llama-3.1-sonar-large-128k-online', 'llama-3.1-sonar-small-128k-online'],
  };

  beforeEach(() => {
    provider = new PerplexityProvider();
    (provider as any).initialized = true;
    (provider as any).config = testConfig;
  });

  it('should have correct provider name', () => {
    expect(provider.name).toBe('Perplexity');
  });

  it('should support llama-3.1-sonar-large-128k-online model', () => {
    expect(provider.supportsModel('llama-3.1-sonar-large-128k-online')).toBe(true);
  });

  it('should support llama-3.1-sonar-small-128k-online model', () => {
    expect(provider.supportsModel('llama-3.1-sonar-small-128k-online')).toBe(true);
  });

  it('should not support unknown models', () => {
    expect(provider.supportsModel('gpt-4o')).toBe(false);
    expect(provider.supportsModel('claude-3-opus')).toBe(false);
  });

  it('should return correct base URL', () => {
    expect(provider.getDefaultBaseUrl()).toBe('https://api.perplexity.ai');
  });

  it('should throw if not initialized', async () => {
    const uninitialized = new PerplexityProvider();
    await expect(uninitialized.complete({
      model: 'llama-3.1-sonar-large-128k-online',
      messages: [{ role: 'user', content: 'Hello' }],
    })).rejects.toThrow('Not initialized');
  });
});
