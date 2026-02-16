/**
 * xAI Provider Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { XAIProvider } from '../../../src/providers/xai.js';

describe('XAIProvider', () => {
  let provider: XAIProvider;

  const testConfig = {
    enabled: true,
    apiKey: 'test-key',
    models: ['grok-2-1212', 'grok-2-vision-1212', 'grok-beta'],
  };

  beforeEach(() => {
    provider = new XAIProvider();
    (provider as any).initialized = true;
    (provider as any).config = testConfig;
  });

  it('should have correct provider name', () => {
    expect(provider.name).toBe('xAI');
  });

  it('should support grok-2 model', () => {
    expect(provider.supportsModel('grok-2-1212')).toBe(true);
  });

  it('should support grok-2-vision model', () => {
    expect(provider.supportsModel('grok-2-vision-1212')).toBe(true);
  });

  it('should support grok-beta model', () => {
    expect(provider.supportsModel('grok-beta')).toBe(true);
  });

  it('should not support unknown models', () => {
    expect(provider.supportsModel('gpt-4o')).toBe(false);
    expect(provider.supportsModel('claude-3-opus')).toBe(false);
  });

  it('should return correct base URL', () => {
    expect(provider.getDefaultBaseUrl()).toBe('https://api.x.ai/v1');
  });

  it('should throw if not initialized', async () => {
    const uninitialized = new XAIProvider();
    await expect(uninitialized.complete({
      model: 'grok-2-1212',
      messages: [{ role: 'user', content: 'Hello' }],
    })).rejects.toThrow('Not initialized');
  });
});
