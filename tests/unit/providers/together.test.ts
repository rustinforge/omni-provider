/**
 * Together Provider Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TogetherProvider } from '../../../src/providers/together.js';

describe('TogetherProvider', () => {
  let provider: TogetherProvider;
  let fetchSpy: any;

  const testConfig = {
    enabled: true,
    apiKey: 'test-key',
    models: ['togethercomputer/llama-2-70b-chat', 'togethercomputer/llama-3-8b-instruct'],
  };

  const mockResponse = {
    id: 'together-chatcmpl-123',
    object: 'chat.completion',
    created: Date.now(),
    model: 'togethercomputer/llama-3-8b-instruct',
    choices: [{
      index: 0,
      message: { role: 'assistant', content: 'Hello from Together!' },
      finish_reason: 'stop',
    }],
    usage: { prompt_tokens: 10, completion_tokens: 8, total_tokens: 18 },
  };

  beforeEach(() => {
    provider = new TogetherProvider();
    (provider as any).initialized = true;
    (provider as any).config = testConfig;
    fetchSpy = vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('should have correct provider name', () => {
    expect(provider.name).toBe('Together');
  });

  it('should support Llama 2 70b model', () => {
    expect(provider.supportsModel('togethercomputer/llama-2-70b-chat')).toBe(true);
  });

  it('should support Llama 3 8b model', () => {
    expect(provider.supportsModel('togethercomputer/llama-3-8b-instruct')).toBe(true);
  });

  it('should not support unknown models', () => {
    expect(provider.supportsModel('gpt-4o')).toBe(false);
    expect(provider.supportsModel('claude-opus-4')).toBe(false);
  });

  it('should return correct base URL', () => {
    expect(provider.getDefaultBaseUrl()).toBe('https://api.together.xyz/v1');
  });

  it('should throw if not initialized', async () => {
    const uninitialized = new TogetherProvider();
    await expect(uninitialized.complete({
      model: 'togethercomputer/llama-2-70b-chat',
      messages: [{ role: 'user', content: 'Hello' }],
    })).rejects.toThrow('Not initialized');
  });

  describe('complete() with mock API', () => {
    it('should make API call with correct request body', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await provider.complete({
        model: 'togethercomputer/llama-3-8b-instruct',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
        maxTokens: 1000,
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toBe('https://api.together.xyz/v1/chat/completions');
      expect(options.method).toBe('POST');
      expect(options.headers['Authorization']).toBe('Bearer test-key');
      
      const body = JSON.parse(options.body);
      expect(body.model).toBe('togethercomputer/llama-3-8b-instruct');
      expect(body.messages).toEqual([{ role: 'user', content: 'Hello' }]);
      expect(body.temperature).toBe(0.7);
      expect(body.max_tokens).toBe(1000);
    });

    it('should return correctly parsed response', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await provider.complete({
        model: 'togethercomputer/llama-3-8b-instruct',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.id).toBe('together-chatcmpl-123');
      expect(result.model).toBe('togethercomputer/llama-3-8b-instruct');
      expect(result.choices[0].message.content).toBe('Hello from Together!');
      expect(result.usage?.totalTokens).toBe(18);
    });

    it('should handle API errors using statusText', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      await expect(provider.complete({
        model: 'togethercomputer/llama-3-8b-instruct',
        messages: [{ role: 'user', content: 'Hello' }],
      })).rejects.toThrow('Together API error: Unauthorized');
    });

    it('should handle rate limiting', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      });

      await expect(provider.complete({
        model: 'togethercomputer/llama-3-8b-instruct',
        messages: [{ role: 'user', content: 'Hello' }],
      })).rejects.toThrow('Together API error: Too Many Requests');
    });

    it('should handle server errors', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(provider.complete({
        model: 'togethercomputer/llama-3-8b-instruct',
        messages: [{ role: 'user', content: 'Hello' }],
      })).rejects.toThrow('Together API error: Internal Server Error');
    });
  });
});