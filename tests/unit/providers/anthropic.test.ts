/**
 * Anthropic Provider Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AnthropicProvider } from '../../../src/providers/anthropic.js';

describe('AnthropicProvider', () => {
  let provider: AnthropicProvider;

  const testConfig = {
    enabled: true,
    apiKey: 'test-key',
    models: ['claude-opus-4', 'claude-sonnet-4', 'claude-haiku-4', 'sonnet', 'opus', 'haiku'],
  };

  beforeEach(() => {
    provider = new AnthropicProvider();
    (provider as any).initialized = true;
    (provider as any).config = testConfig;
  });

  it('should have correct provider name', () => {
    expect(provider.name).toBe('Anthropic');
  });

  it('should support claude-opus-4 model', () => {
    expect(provider.supportsModel('claude-opus-4')).toBe(true);
  });

  it('should support claude-sonnet-4 model', () => {
    expect(provider.supportsModel('claude-sonnet-4')).toBe(true);
  });

  it('should support claude-haiku-4 model', () => {
    expect(provider.supportsModel('claude-haiku-4')).toBe(true);
  });

  it('should support alias sonnet', () => {
    expect(provider.supportsModel('sonnet')).toBe(true);
  });

  it('should support alias opus', () => {
    expect(provider.supportsModel('opus')).toBe(true);
  });

  it('should support alias haiku', () => {
    expect(provider.supportsModel('haiku')).toBe(true);
  });

  it('should not support unknown models', () => {
    expect(provider.supportsModel('gpt-4o')).toBe(false);
    expect(provider.supportsModel('gemini-pro')).toBe(false);
  });

  it('should return correct base URL', () => {
    expect(provider.getDefaultBaseUrl()).toBe('https://api.anthropic.com/v1');
  });

  it('should throw if not initialized', async () => {
    const uninitialized = new AnthropicProvider();
    await expect(uninitialized.complete({
      model: 'claude-sonnet-4',
      messages: [{ role: 'user', content: 'Hello' }],
    })).rejects.toThrow('Not initialized');
  });
});
