/**
 * Moonshot Provider Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MoonshotProvider } from '../../../src/providers/moonshot.js';

describe('MoonshotProvider', () => {
  let provider: MoonshotProvider;

  const testConfig = {
    enabled: true,
    apiKey: 'test-key',
    models: ['kimi-latest', 'kimi-k2.5-pro', 'kimi-k2.5-flash'],
  };

  beforeEach(() => {
    provider = new MoonshotProvider();
    (provider as any).initialized = true;
    (provider as any).config = testConfig;
  });

  it('should have correct provider name', () => {
    expect(provider.name).toBe('Moonshot');
  });

  it('should support kimi-latest model', () => {
    expect(provider.supportsModel('kimi-latest')).toBe(true);
  });

  it('should support kimi-k2.5-pro model', () => {
    expect(provider.supportsModel('kimi-k2.5-pro')).toBe(true);
  });

  it('should support kimi-k2.5-flash model', () => {
    expect(provider.supportsModel('kimi-k2.5-flash')).toBe(true);
  });

  it('should not support unknown models', () => {
    expect(provider.supportsModel('gpt-4o')).toBe(false);
    expect(provider.supportsModel('claude-3-opus')).toBe(false);
  });

  it('should return correct base URL', () => {
    expect(provider.getDefaultBaseUrl()).toBe('https://api.moonshot.cn/v1');
  });

  it('should throw if not initialized', async () => {
    const uninitialized = new MoonshotProvider();
    await expect(uninitialized.complete({
      model: 'kimi-latest',
      messages: [{ role: 'user', content: 'Hello' }],
    })).rejects.toThrow('Not initialized');
  });
});
