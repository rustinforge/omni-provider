/**
 * Anyscale Provider Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AnyscaleProvider } from '../../../src/providers/anyscale.js';

describe('AnyscaleProvider', () => {
  let provider: AnyscaleProvider;

  const testConfig = {
    enabled: true,
    apiKey: 'test-key',
    models: ['mistralai/Mixtral-8x7B-Instruct-v0.1', 'meta-llama/Llama-2-70b-chat-hf'],
  };

  beforeEach(() => {
    provider = new AnyscaleProvider();
    (provider as any).initialized = true;
    (provider as any).config = testConfig;
  });

  it('should have correct provider name', () => {
    expect(provider.name).toBe('Anyscale');
  });

  it('should support Mixtral model', () => {
    expect(provider.supportsModel('mistralai/Mixtral-8x7B-Instruct-v0.1')).toBe(true);
  });

  it('should support Llama model', () => {
    expect(provider.supportsModel('meta-llama/Llama-2-70b-chat-hf')).toBe(true);
  });

  it('should not support unknown models', () => {
    expect(provider.supportsModel('gpt-4o')).toBe(false);
    expect(provider.supportsModel('claude-opus-4')).toBe(false);
  });

  it('should return correct base URL', () => {
    expect(provider.getDefaultBaseUrl()).toBe('https://api.endpoints.anyscale.com/v1');
  });

  it('should throw if not initialized', async () => {
    const uninitialized = new AnyscaleProvider();
    await expect(uninitialized.complete({
      model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
      messages: [{ role: 'user', content: 'Hello' }],
    })).rejects.toThrow('Not initialized');
  });
});
