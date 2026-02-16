/**
 * Azure Provider Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AzureProvider } from '../../../src/providers/azure.js';

describe('AzureProvider', () => {
  let provider: AzureProvider;

  const testConfig = {
    enabled: true,
    apiKey: 'test-key',
    baseUrl: 'https://my-resource.openai.azure.com',
    models: ['gpt-4o', 'gpt-35-turbo'],
  };

  beforeEach(() => {
    provider = new AzureProvider();
    (provider as any).initialized = true;
    (provider as any).config = testConfig;
  });

  it('should have correct provider name', () => {
    expect(provider.name).toBe('Azure');
  });

  it('should support gpt-4o model', () => {
    expect(provider.supportsModel('gpt-4o')).toBe(true);
  });

  it('should support gpt-35-turbo model', () => {
    expect(provider.supportsModel('gpt-35-turbo')).toBe(true);
  });

  it('should not support unknown models', () => {
    expect(provider.supportsModel('claude-opus-4')).toBe(false);
    expect(provider.supportsModel('gemini-pro')).toBe(false);
  });

  it('should use configured base URL', () => {
    expect(provider.getDefaultBaseUrl()).toBe('https://my-resource.openai.azure.com');
  });

  it('should throw if not initialized', async () => {
    const uninitialized = new AzureProvider();
    await expect(uninitialized.complete({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
    })).rejects.toThrow('Not initialized');
  });
});
