/**
 * Together Provider Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TogetherProvider } from '../../../src/providers/together.js';

describe('TogetherProvider', () => {
  let provider: TogetherProvider;

  const testConfig = {
    enabled: true,
    apiKey: 'test-key',
    models: ['togethercomputer/llama-2-70b-chat', 'togethercomputer/llama-3-8b-instruct'],
  };

  beforeEach(() => {
    provider = new TogetherProvider();
    (provider as any).initialized = true;
    (provider as any).config = testConfig;
  });

  it('should have correct provider name', () => {
    expect(provider.name).toBe('Together');
  });

  it('should support Llama 2 70b model', () => {
    expect(provider.supportsModel('togethercomputer/llama-2-70b-chat')).toBe(true);
  });

  it('should support Llama 3 8b model', () => {
    expect(provider.supportsModel('togethercomputer/llama-3-8b-instruct')).toBe(true);
  });

  it('should not support unknown models', () => {
    expect(provider.supportsModel('gpt-4o')).toBe(false);
    expect(provider.supportsModel('claude-opus-4')).toBe(false);
  });

  it('should return correct base URL', () => {
    expect(provider.getDefaultBaseUrl()).toBe('https://api.together.xyz/v1');
  });

  it('should throw if not initialized', async () => {
    const uninitialized = new TogetherProvider();
    await expect(uninitialized.complete({
      model: 'togethercomputer/llama-2-70b-chat',
      messages: [{ role: 'user', content: 'Hello' }],
    })).rejects.toThrow('Not initialized');
  });
});
