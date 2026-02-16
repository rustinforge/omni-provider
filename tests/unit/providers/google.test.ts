/**
 * Google Provider Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GoogleProvider } from '../../../src/providers/google.js';

describe('GoogleProvider', () => {
  let provider: GoogleProvider;

  const testConfig = {
    enabled: true,
    apiKey: 'test-key',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash', 'pro', 'flash'],
  };

  beforeEach(() => {
    provider = new GoogleProvider();
    (provider as any).initialized = true;
    (provider as any).config = testConfig;
  });

  it('should have correct provider name', () => {
    expect(provider.name).toBe('Google');
  });

  it('should support gemini-2.5-pro model', () => {
    expect(provider.supportsModel('gemini-2.5-pro')).toBe(true);
  });

  it('should support gemini-2.5-flash model', () => {
    expect(provider.supportsModel('gemini-2.5-flash')).toBe(true);
  });

  it('should support gemini-1.5-pro model', () => {
    expect(provider.supportsModel('gemini-1.5-pro')).toBe(true);
  });

  it('should support gemini-1.5-flash model', () => {
    expect(provider.supportsModel('gemini-1.5-flash')).toBe(true);
  });

  it('should support alias pro', () => {
    expect(provider.supportsModel('pro')).toBe(true);
  });

  it('should support alias flash', () => {
    expect(provider.supportsModel('flash')).toBe(true);
  });

  it('should not support unknown models', () => {
    expect(provider.supportsModel('gpt-4o')).toBe(false);
    expect(provider.supportsModel('claude-3-opus')).toBe(false);
  });

  it('should return correct base URL', () => {
    expect(provider.getDefaultBaseUrl()).toBe('https://generativelanguage.googleapis.com/v1beta');
  });

  it('should throw if not initialized', async () => {
    const uninitialized = new GoogleProvider();
    await expect(uninitialized.complete({
      model: 'gemini-1.5-pro',
      messages: [{ role: 'user', content: 'Hello' }],
    })).rejects.toThrow('Not initialized');
  });
});
