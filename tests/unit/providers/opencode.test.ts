/**
 * OpenCode Provider Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenCodeProvider } from '../../../src/providers/opencode.js';

describe('OpenCodeProvider', () => {
  let provider: OpenCodeProvider;

  beforeEach(() => {
    provider = new OpenCodeProvider();
  });

  it('should have correct provider name', () => {
    expect(provider.name).toBe('OpenCode');
  });

  it('should support big-pickle model', () => {
    expect(provider.supportsModel('big-pickle')).toBe(true);
  });

  it('should support gpt-5-nano model', () => {
    expect(provider.supportsModel('gpt-5-nano')).toBe(true);
  });

  it('should not support unknown models', () => {
    expect(provider.supportsModel('unknown-model')).toBe(false);
  });

  it('should return correct base URL', () => {
    expect(provider.getDefaultBaseUrl()).toBe('https://api.opencode.ai/v1');
  });

  it('should throw if not initialized', async () => {
    await expect(provider.complete({
      model: 'big-pickle',
      messages: [{ role: 'user', content: 'Hello' }],
    })).rejects.toThrow('Not initialized');
  });
});
