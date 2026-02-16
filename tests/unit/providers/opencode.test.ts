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

  it('should support kimi-k2.5-free model', () => {
    expect(provider.supportsModel('kimi-k2.5-free')).toBe(true);
  });

  it('should support minimax-m2.5-free model', () => {
    expect(provider.supportsModel('minimax-m2.5-free')).toBe(true);
  });

  it('should support opencode/ prefix', () => {
    expect(provider.supportsModel('opencode/big-pickle')).toBe(true);
  });

  it('should handle initialize with config', () => {
    provider.initialize({ enabled: true, apiKey: 'test-key' });
    expect((provider as any).initialized).toBe(true);
    expect((provider as any).config.apiKey).toBe('test-key');
  });

  it('should handle complete request when initialized', async () => {
    provider.initialize({ enabled: true, apiKey: 'test-key' });
    
    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        id: 'test-id',
        model: 'big-pickle',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Hello!' },
          finish_reason: 'stop',
        }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }),
    });

    const result = await provider.complete({
      model: 'big-pickle',
      messages: [{ role: 'user', content: 'Hi' }],
    });

    expect(result.choices[0].message.content).toBe('Hello!');
    expect(result.usage?.totalTokens).toBe(15);
  });

  it('should handle API errors', async () => {
    provider.initialize({ enabled: true, apiKey: 'test-key' });
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      statusText: 'Unauthorized',
      json: () => Promise.resolve({ error: { message: 'Invalid API key' } }),
    });

    await expect(provider.complete({
      model: 'big-pickle',
      messages: [{ role: 'user', content: 'Hi' }],
    })).rejects.toThrow('OpenCode API error');
  });

  it('should strip opencode/ prefix from model', async () => {
    provider.initialize({ enabled: true, apiKey: 'test-key' });
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        id: 'test-id',
        model: 'big-pickle',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Response' },
          finish_reason: 'stop',
        }],
      }),
    });

    await provider.complete({
      model: 'opencode/big-pickle',
      messages: [{ role: 'user', content: 'Hi' }],
    });

    expect(fetch).toHaveBeenCalledWith(
      'https://api.opencode.ai/v1/chat/completions',
      expect.objectContaining({
        body: expect.stringContaining('"model":"big-pickle"'),
      })
    );
  });
});
