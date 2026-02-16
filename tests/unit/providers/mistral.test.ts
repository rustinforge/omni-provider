/**
 * Mistral Provider Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MistralProvider } from '../../../src/providers/mistral.js';

describe('MistralProvider', () => {
  let provider: MistralProvider;

  const testConfig = {
    enabled: true,
    apiKey: 'test-key',
    models: ['mistral-large-latest', 'mistral-small-latest', 'mistral-medium-latest'],
  };

  beforeEach(() => {
    provider = new MistralProvider();
    (provider as any).initialized = true;
    (provider as any).config = testConfig;
  });

  it('should have correct provider name', () => {
    expect(provider.name).toBe('Mistral');
  });

  it('should support mistral-large-latest model', () => {
    expect(provider.supportsModel('mistral-large-latest')).toBe(true);
  });

  it('should support mistral-small-latest model', () => {
    expect(provider.supportsModel('mistral-small-latest')).toBe(true);
  });

  it('should support mistral-medium-latest model', () => {
    expect(provider.supportsModel('mistral-medium-latest')).toBe(true);
  });

  it('should not support unknown models', () => {
    expect(provider.supportsModel('gpt-4o')).toBe(false);
    expect(provider.supportsModel('claude-3-opus')).toBe(false);
  });

  it('should return correct base URL', () => {
    expect(provider.getDefaultBaseUrl()).toBe('https://api.mistral.ai/v1');
  });

  it('should throw if not initialized', async () => {
    const uninitialized = new MistralProvider();
    await expect(uninitialized.complete({
      model: 'mistral-large-latest',
      messages: [{ role: 'user', content: 'Hello' }],
    })).rejects.toThrow('Not initialized');
  });
});
