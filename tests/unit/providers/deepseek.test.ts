/**
 * DeepSeek Provider Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DeepSeekProvider } from '../../../src/providers/deepseek.js';

describe('DeepSeekProvider', () => {
  let provider: DeepSeekProvider;

  const testConfig = {
    enabled: true,
    apiKey: 'test-key',
    models: ['deepseek-chat', 'deepseek-coder'],
  };

  beforeEach(() => {
    provider = new DeepSeekProvider();
    (provider as any).initialized = true;
    (provider as any).config = testConfig;
  });

  it('should have correct provider name', () => {
    expect(provider.name).toBe('DeepSeek');
  });

  it('should support deepseek-chat model', () => {
    expect(provider.supportsModel('deepseek-chat')).toBe(true);
  });

  it('should support deepseek-coder model', () => {
    expect(provider.supportsModel('deepseek-coder')).toBe(true);
  });

  it('should not support unknown models', () => {
    expect(provider.supportsModel('gpt-4o')).toBe(false);
    expect(provider.supportsModel('claude-3-opus')).toBe(false);
  });

  it('should return correct base URL', () => {
    expect(provider.getDefaultBaseUrl()).toBe('https://api.deepseek.com/v1');
  });

  it('should throw if not initialized', async () => {
    const uninitialized = new DeepSeekProvider();
    await expect(uninitialized.complete({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: 'Hello' }],
    })).rejects.toThrow('Not initialized');
  });
});
