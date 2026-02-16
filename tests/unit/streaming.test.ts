/**
 * Streaming Support Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenCodeProvider } from '../../src/providers/opencode';

describe('Provider Streaming', () => {
  let provider: OpenCodeProvider;

  const testConfig = {
    enabled: true,
    apiKey: 'test-key',
    baseUrl: 'https://api.opencode.ai/v1',
  };

  beforeEach(() => {
    provider = new OpenCodeProvider();
    (provider as any).initialized = true;
    (provider as any).config = testConfig;
  });

  it('should have correct base URL for streaming', () => {
    expect(provider.getDefaultBaseUrl()).toBe('https://api.opencode.ai/v1');
  });

  it('should support streaming-capable models', () => {
    // big-pickle has streaming: true in models.ts
    expect(provider.supportsModel('big-pickle')).toBe(true);
  });

  it('should handle non-streaming request correctly', async () => {
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
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }),
    });

    const result = await provider.complete({
      model: 'big-pickle',
      messages: [{ role: 'user', content: 'Hi' }],
    });

    expect(result.choices[0].message.content).toBe('Response');
    expect(fetch).toHaveBeenCalledWith(
      'https://api.opencode.ai/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });
});
