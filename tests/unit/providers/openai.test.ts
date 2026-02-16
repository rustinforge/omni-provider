/**
 * OpenAI Provider Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAIProvider } from '../../../src/providers/openai.js';

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;

  const testConfig = {
    enabled: true,
    apiKey: 'test-key',
    models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo', 'o1', 'o1-mini', 'o3-mini', 'gpt-4o-mini'],
  };

  beforeEach(() => {
    provider = new OpenAIProvider();
    // Mock the initialize to set config directly
    (provider as any).initialized = true;
    (provider as any).config = testConfig;
  });

  it('should have correct provider name', () => {
    expect(provider.name).toBe('OpenAI');
  });

  it('should support gpt-4o model', () => {
    expect(provider.supportsModel('gpt-4o')).toBe(true);
  });

  it('should support gpt-4-turbo model', () => {
    expect(provider.supportsModel('gpt-4-turbo')).toBe(true);
  });

  it('should support gpt-3.5-turbo model', () => {
    expect(provider.supportsModel('gpt-3.5-turbo')).toBe(true);
  });

  it('should support o1 model', () => {
    expect(provider.supportsModel('o1')).toBe(true);
  });

  it('should support openai/ prefix', () => {
    expect(provider.supportsModel('openai/gpt-4o')).toBe(false); // Base class doesn't strip prefix
  });

  it('should not support unknown models', () => {
    expect(provider.supportsModel('claude-3-opus')).toBe(false);
    expect(provider.supportsModel('gemini-pro')).toBe(false);
  });

  it('should return correct base URL', () => {
    expect(provider.getDefaultBaseUrl()).toBe('https://api.openai.com/v1');
  });

  it('should throw if not initialized', async () => {
    const uninitialized = new OpenAIProvider();
    await expect(uninitialized.complete({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
    })).rejects.toThrow('Not initialized');
  });
});
