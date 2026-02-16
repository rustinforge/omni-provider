/**
 * Cohere Provider Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CohereProvider } from '../../../src/providers/cohere.js';

describe('CohereProvider', () => {
  let provider: CohereProvider;

  const testConfig = {
    enabled: true,
    apiKey: 'test-key',
    models: ['command-r-plus', 'command-r', 'command'],
  };

  beforeEach(() => {
    provider = new CohereProvider();
    (provider as any).initialized = true;
    (provider as any).config = testConfig;
  });

  it('should have correct provider name', () => {
    expect(provider.name).toBe('Cohere');
  });

  it('should support command-r-plus model', () => {
    expect(provider.supportsModel('command-r-plus')).toBe(true);
  });

  it('should support command-r model', () => {
    expect(provider.supportsModel('command-r')).toBe(true);
  });

  it('should support command model', () => {
    expect(provider.supportsModel('command')).toBe(true);
  });

  it('should not support unknown models', () => {
    expect(provider.supportsModel('gpt-4o')).toBe(false);
    expect(provider.supportsModel('claude-3-opus')).toBe(false);
  });

  it('should return correct base URL', () => {
    expect(provider.getDefaultBaseUrl()).toBe('https://api.cohere.ai/v1');
  });

  it('should throw if not initialized', async () => {
    const uninitialized = new CohereProvider();
    await expect(uninitialized.complete({
      model: 'command-r-plus',
      messages: [{ role: 'user', content: 'Hello' }],
    })).rejects.toThrow('Not initialized');
  });
});
