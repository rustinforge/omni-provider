/**
 * OpenRouter Provider Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OpenRouterProvider } from '../../../src/providers/openrouter.js';

describe('OpenRouterProvider', () => {
  let provider: OpenRouterProvider;

  const testConfig = {
    enabled: true,
    apiKey: 'test-key',
    models: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet', 'google/gemini-pro'],
  };

  beforeEach(() => {
    provider = new OpenRouterProvider();
    (provider as any).initialized = true;
    (provider as any).config = testConfig;
  });

  it('should have correct provider name', () => {
    expect(provider.name).toBe('OpenRouter');
  });

  it('should support openai/gpt-4o model', () => {
    expect(provider.supportsModel('openai/gpt-4o')).toBe(true);
  });

  it('should support anthropic/claude-3.5-sonnet model', () => {
    expect(provider.supportsModel('anthropic/claude-3.5-sonnet')).toBe(true);
  });

  it('should support google/gemini-pro model', () => {
    expect(provider.supportsModel('google/gemini-pro')).toBe(true);
  });

  it('should not support unknown models', () => {
    expect(provider.supportsModel('unknown-model')).toBe(false);
  });

  it('should return correct base URL', () => {
    expect(provider.getDefaultBaseUrl()).toBe('https://openrouter.ai/api/v1');
  });

  it('should throw if not initialized', async () => {
    const uninitialized = new OpenRouterProvider();
    await expect(uninitialized.complete({
      model: 'openai/gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
    })).rejects.toThrow('Not initialized');
  });
});
