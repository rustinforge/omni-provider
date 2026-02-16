/**
 * OpenCode Provider Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenCodeProvider } from '../../../src/providers/opencode.js';

describe('OpenCodeProvider', () => {
  let provider: OpenCodeProvider;
  let fetchSpy: any;

  const testConfig = {
    enabled: true,
    apiKey: 'test-key',
    baseUrl: 'https://api.opencode.ai/v1',
  };

  beforeEach(() => {
    provider = new OpenCodeProvider();
    // Mock the initialize to set config directly
    (provider as any).initialized = true;
    (provider as any).config = testConfig;
    fetchSpy = vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
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
    const uninitialized = new OpenCodeProvider();
    await expect(uninitialized.complete({
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

  it('should handle complete request when initialized', async () => {
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

  // ============================================
  // NEW COMPREHENSIVE TEST CASES
  // ============================================

  describe('Rate Limiting (429)', () => {
    it('should handle rate limit error with retry-after header', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Map([['retry-after', '60']]),
        json: () => Promise.resolve({ error: { message: 'Rate limit exceeded' } }),
      });

      await expect(provider.complete({
        model: 'big-pickle',
        messages: [{ role: 'user', content: 'Hi' }],
      })).rejects.toThrow('OpenCode API error');
    });

    it('should handle rate limit without retry-after header', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: () => Promise.resolve({ error: { message: 'Rate limit exceeded, please wait' } }),
      });

      await expect(provider.complete({
        model: 'big-pickle',
        messages: [{ role: 'user', content: 'Hi' }],
      })).rejects.toThrow('OpenCode API error');
    });
  });

  describe('Invalid Request Handling (400)', () => {
    it('should handle invalid model error', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ error: { message: 'Invalid model specified' } }),
      });

      await expect(provider.complete({
        model: 'invalid-model',
        messages: [{ role: 'user', content: 'Hi' }],
      })).rejects.toThrow('OpenCode API error');
    });

    it('should handle empty messages error', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ error: { message: 'messages cannot be empty' } }),
      });

      await expect(provider.complete({
        model: 'big-pickle',
        messages: [],
      })).rejects.toThrow('OpenCode API error');
    });

    it('should handle malformed JSON in request', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ error: { message: 'Invalid JSON format' } }),
      });

      await expect(provider.complete({
        model: 'big-pickle',
        messages: [{ role: 'user', content: 'Hi' }],
      })).rejects.toThrow();
    });
  });

  describe('Token Usage Tracking', () => {
    it('should track usage when provided in response', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'test-id',
          model: 'big-pickle',
          choices: [{
            index: 0,
            message: { role: 'assistant', content: 'Response text' },
            finish_reason: 'stop',
          }],
          usage: {
            prompt_tokens: 150,
            completion_tokens: 50,
            total_tokens: 200,
          },
        }),
      });

      const result = await provider.complete({
        model: 'big-pickle',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.usage?.promptTokens).toBe(150);
      expect(result.usage?.completionTokens).toBe(50);
      expect(result.usage?.totalTokens).toBe(200);
    });

    it('should handle response without usage field', async () => {
      fetchSpy.mockResolvedValue({
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

      const result = await provider.complete({
        model: 'big-pickle',
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(result.usage).toBeUndefined();
    });

    it('should track usage for different models', async () => {
      const models = ['big-pickle', 'gpt-5-nano', 'kimi-k2.5-free', 'minimax-m2.5-free'];
      
      for (const model of models) {
        fetchSpy.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({
            id: `test-${model}`,
            model: model,
            choices: [{ index: 0, message: { role: 'assistant', content: 'Response' }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 100, completion_tokens: 25, total_tokens: 125 },
          }),
        });

        const result = await provider.complete({
          model,
          messages: [{ role: 'user', content: 'Test' }],
        });

        expect(result.usage?.totalTokens).toBe(125);
      }
    });
  });

  describe('Different Model Variants', () => {
    it('should handle big-pickle model', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'test-1',
          model: 'big-pickle',
          choices: [{ index: 0, message: { role: 'assistant', content: 'Response' }, finish_reason: 'stop' }],
        }),
      });

      const result = await provider.complete({
        model: 'big-pickle',
        messages: [{ role: 'user', content: 'Hi' }],
      });
      expect(result.model).toBe('big-pickle');
    });

    it('should handle gpt-5-nano model', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'test-2',
          model: 'gpt-5-nano',
          choices: [{ index: 0, message: { role: 'assistant', content: 'Response' }, finish_reason: 'stop' }],
        }),
      });

      const result = await provider.complete({
        model: 'gpt-5-nano',
        messages: [{ role: 'user', content: 'Hi' }],
      });
      expect(result.model).toBe('gpt-5-nano');
    });

    it('should handle kimi-k2.5-free model', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'test-3',
          model: 'kimi-k2.5-free',
          choices: [{ index: 0, message: { role: 'assistant', content: 'Response' }, finish_reason: 'stop' }],
        }),
      });

      const result = await provider.complete({
        model: 'kimi-k2.5-free',
        messages: [{ role: 'user', content: 'Hi' }],
      });
      expect(result.model).toBe('kimi-k2.5-free');
    });

    it('should handle minimax-m2.5-free model', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'test-4',
          model: 'minimax-m2.5-free',
          choices: [{ index: 0, message: { role: 'assistant', content: 'Response' }, finish_reason: 'stop' }],
        }),
      });

      const result = await provider.complete({
        model: 'minimax-m2.5-free',
        messages: [{ role: 'user', content: 'Hi' }],
      });
      expect(result.model).toBe('minimax-m2.5-free');
    });
  });

  describe('Error Recovery', () => {
    it('should handle server error (500)', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ error: { message: 'Internal server error' } }),
      });

      await expect(provider.complete({
        model: 'big-pickle',
        messages: [{ role: 'user', content: 'Hi' }],
      })).rejects.toThrow('OpenCode API error');
    });

    it('should handle service unavailable (503)', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: () => Promise.resolve({ error: { message: 'Service temporarily unavailable' } }),
      });

      await expect(provider.complete({
        model: 'big-pickle',
        messages: [{ role: 'user', content: 'Hi' }],
      })).rejects.toThrow('OpenCode API error');
    });

    it('should handle network error (fetch throws)', async () => {
      fetchSpy.mockRejectedValue(new Error('Network error'));

      await expect(provider.complete({
        model: 'big-pickle',
        messages: [{ role: 'user', content: 'Hi' }],
      })).rejects.toThrow();
    });

    it('should handle gateway timeout (504)', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 504,
        statusText: 'Gateway Timeout',
        json: () => Promise.resolve({ error: { message: 'Gateway timeout' } }),
      });

      await expect(provider.complete({
        model: 'big-pickle',
        messages: [{ role: 'user', content: 'Hi' }],
      })).rejects.toThrow('OpenCode API error');
    });
  });

  describe('Streaming Responses', () => {
    it('should handle streaming response', async () => {
      const streamMock = {
        getReader: () => ({
          read: vi.fn()
            .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n') })
            .mockResolvedValueOnce({ done: true, value: new TextEncoder().encode('data: [DONE]') }),
        }),
      };

      fetchSpy.mockResolvedValue({
        ok: true,
        body: streamMock,
      });

      const chunks: any[] = [];
      for await (const chunk of provider.stream({
        model: 'big-pickle',
        messages: [{ role: 'user', content: 'Hello' }],
      })) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].choices[0].delta.content).toBe('Hello');
    });

    it('should handle streaming finish reason', async () => {
      const streamMock = {
        getReader: () => ({
          read: vi.fn()
            .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Test"},"finish_reason":null}]}\n\n') })
            .mockResolvedValueOnce({ done: true, value: new TextEncoder().encode('data: [DONE]') }),
        }),
      };

      fetchSpy.mockResolvedValue({
        ok: true,
        body: streamMock,
      });

      const chunks: any[] = [];
      for await (const chunk of provider.stream({
        model: 'big-pickle',
        messages: [{ role: 'user', content: 'Hi' }],
      })) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBe(1);
    });
  });

  describe('Timeout Handling', () => {
    it('should handle request timeout', async () => {
      fetchSpy.mockRejectedValue(new Error('Request timed out'));

      await expect(provider.complete({
        model: 'big-pickle',
        messages: [{ role: 'user', content: 'Hi' }],
      })).rejects.toThrow();
    });
  });

  describe('Request Parameters', () => {
    it('should pass temperature parameter', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'test',
          model: 'big-pickle',
          choices: [{ index: 0, message: { role: 'assistant', content: 'Response' }, finish_reason: 'stop' }],
        }),
      });

      await provider.complete({
        model: 'big-pickle',
        messages: [{ role: 'user', content: 'Hi' }],
        temperature: 0.9,
      });

      const [, options] = fetchSpy.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.temperature).toBe(0.9);
    });

    it('should pass max_tokens parameter', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'test',
          model: 'big-pickle',
          choices: [{ index: 0, message: { role: 'assistant', content: 'Response' }, finish_reason: 'stop' }],
        }),
      });

      await provider.complete({
        model: 'big-pickle',
        messages: [{ role: 'user', content: 'Hi' }],
        maxTokens: 500,
      });

      const [, options] = fetchSpy.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.max_tokens).toBe(500);
    });

    it('should pass top_p parameter', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'test',
          model: 'big-pickle',
          choices: [{ index: 0, message: { role: 'assistant', content: 'Response' }, finish_reason: 'stop' }],
        }),
      });

      await provider.complete({
        model: 'big-pickle',
        messages: [{ role: 'user', content: 'Hi' }],
        topP: 0.8,
      });

      const [, options] = fetchSpy.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.top_p).toBe(0.8);
    });
  });
});
