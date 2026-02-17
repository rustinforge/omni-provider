/**
 * DeepSeek Provider Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DeepSeekProvider } from '../../../src/providers/deepseek.js';

describe('DeepSeekProvider', () => {
  let provider: DeepSeekProvider;
  let fetchSpy: any;

  const testConfig = {
    enabled: true,
    apiKey: 'test-key',
    models: ['deepseek-v3', 'deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'],
  };

  const mockResponse = {
    id: 'ds-chatcmpl-123',
    object: 'chat.completion',
    created: Date.now(),
    model: 'deepseek-v3',
    choices: [{
      index: 0,
      message: { role: 'assistant', content: 'Hello from DeepSeek!' },
      finish_reason: 'stop',
    }],
    usage: { prompt_tokens: 10, completion_tokens: 8, total_tokens: 18 },
  };

  beforeEach(() => {
    provider = new DeepSeekProvider();
    (provider as any).initialized = true;
    (provider as any).config = testConfig;
    
    fetchSpy = vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('should have correct provider name', () => {
    expect(provider.name).toBe('DeepSeek');
  });

  it('should support deepseek-v3 model', () => {
    expect(provider.supportsModel('deepseek-v3')).toBe(true);
  });

  it('should support deepseek-chat model', () => {
    expect(provider.supportsModel('deepseek-chat')).toBe(true);
  });

  it('should support deepseek-coder model', () => {
    expect(provider.supportsModel('deepseek-coder')).toBe(true);
  });

  it('should support deepseek-reasoner model', () => {
    expect(provider.supportsModel('deepseek-reasoner')).toBe(true);
  });

  it('should not support unknown models', () => {
    expect(provider.supportsModel('gpt-4o')).toBe(false);
    expect(provider.supportsModel('claude-3-opus')).toBe(false);
  });

  it('should return correct base URL', () => {
    expect(provider.getDefaultBaseUrl()).toBe('https://api.deepseek.com/v1');
  });

  it('should throw if not initialized', async () => {
    const uninitialized = new DeepSeekProvider();
    await expect(uninitialized.complete({
      model: 'deepseek-v3',
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
        model: 'deepseek-v3',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
        maxTokens: 1000,
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      
      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toBe('https://api.deepseek.com/v1/chat/completions');
      expect(options.method).toBe('POST');
      expect(options.headers['Authorization']).toBe('Bearer test-key');
      expect(options.headers['Content-Type']).toBe('application/json');
      
      const body = JSON.parse(options.body);
      expect(body.model).toBe('deepseek-v3');
      expect(body.messages).toEqual([{ role: 'user', content: 'Hello' }]);
      expect(body.temperature).toBe(0.7);
      expect(body.max_tokens).toBe(1000);
      expect(body.stream).toBe(false);
    });

    it('should return correctly parsed response', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await provider.complete({
        model: 'deepseek-v3',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.id).toBe('ds-chatcmpl-123');
      expect(result.model).toBe('deepseek-v3');
      expect(result.choices).toHaveLength(1);
      expect(result.choices[0].message.content).toBe('Hello from DeepSeek!');
      expect(result.choices[0].message.role).toBe('assistant');
      expect(result.choices[0].finishReason).toBe('stop');
      expect(result.usage?.promptTokens).toBe(10);
      expect(result.usage?.completionTokens).toBe(8);
      expect(result.usage?.totalTokens).toBe(18);
    });

    it('should handle API errors correctly', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ error: { message: 'Invalid API key' } }),
      });

      await expect(provider.complete({
        model: 'deepseek-v3',
        messages: [{ role: 'user', content: 'Hello' }],
      })).rejects.toThrow('DeepSeek API error: Invalid API key');
    });

    it('should handle rate limiting errors (429)', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: () => Promise.resolve({ error: { message: 'Rate limit exceeded' } }),
      });

      await expect(provider.complete({
        model: 'deepseek-v3',
        messages: [{ role: 'user', content: 'Hello' }],
      })).rejects.toThrow('DeepSeek API error: Rate limit exceeded');
    });

    it('should handle server errors (500)', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ error: { message: 'Internal server error' } }),
      });

      await expect(provider.complete({
        model: 'deepseek-v3',
        messages: [{ role: 'user', content: 'Hello' }],
      })).rejects.toThrow('DeepSeek API error: Internal server error');
    });

    it('should handle network errors', async () => {
      fetchSpy.mockRejectedValue(new Error('Network error'));

      await expect(provider.complete({
        model: 'deepseek-v3',
        messages: [{ role: 'user', content: 'Hello' }],
      })).rejects.toThrow('Network error');
    });

    it('should handle empty messages array', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'ds-empty',
          model: 'deepseek-v3',
          choices: [{
            index: 0,
            message: { role: 'assistant', content: 'No input provided' },
            finish_reason: 'stop',
          }],
        }),
      });

      const result = await provider.complete({
        model: 'deepseek-v3',
        messages: [],
      });

      expect(result.choices[0].message.content).toBe('No input provided');
    });

    it('should handle multi-turn conversation', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const messages = [
        { role: 'system', content: 'You are a helpful coding assistant.' },
        { role: 'user', content: 'Write a Python function to reverse a string.' },
        { role: 'assistant', content: 'Here is a simple function:' },
        { role: 'user', content: 'Can you optimize it?' },
      ];

      await provider.complete({
        model: 'deepseek-coder',
        messages,
      });

      const [, options] = fetchSpy.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.messages).toHaveLength(4);
      expect(body.messages[0].role).toBe('system');
      expect(body.messages[1].role).toBe('user');
    });

    it('should handle response with reasoning field', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'ds-reasoner',
          model: 'deepseek-reasoner',
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: 'The answer is 42.',
              reasoning_content: 'Let me think step by step...',
            },
            finish_reason: 'stop',
          }],
          usage: { prompt_tokens: 20, completion_tokens: 50, total_tokens: 70 },
        }),
      });

      const result = await provider.complete({
        model: 'deepseek-reasoner',
        messages: [{ role: 'user', content: 'What is the meaning of life?' }],
      });

      expect(result.choices[0].message.content).toBe('The answer is 42.');
      expect(result.usage?.totalTokens).toBe(70);
    });

    it('should handle response without usage data', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'ds-nousage',
          model: 'deepseek-v3',
          choices: [{
            index: 0,
            message: { role: 'assistant', content: 'No usage here' },
            finish_reason: 'stop',
          }],
        }),
      });

      const result = await provider.complete({
        model: 'deepseek-v3',
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(result.usage).toBeUndefined();
    });

    it('should generate id when response lacks one', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          model: 'deepseek-v3',
          choices: [{
            index: 0,
            message: { role: 'assistant', content: 'No ID' },
            finish_reason: 'stop',
          }],
        }),
      });

      const result = await provider.complete({
        model: 'deepseek-v3',
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(result.id).toBeDefined();
      expect(result.id.length).toBeGreaterThan(0);
    });

    it('should handle empty choices array', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'ds-empty',
          model: 'deepseek-v3',
          choices: [],
        }),
      });

      const result = await provider.complete({
        model: 'deepseek-v3',
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(result.choices).toHaveLength(0);
    });

    it('should handle malformed json error response', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      await expect(provider.complete({
        model: 'deepseek-v3',
        messages: [{ role: 'user', content: 'Hi' }],
      })).rejects.toThrow('DeepSeek API error: Bad Request');
    });
  });

  describe('different model variants', () => {
    it('should handle deepseek-v3 with high token usage', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'ds-v3-large',
          model: 'deepseek-v3',
          choices: [{
            index: 0,
            message: { role: 'assistant', content: 'Long response content...' },
            finish_reason: 'stop',
          }],
          usage: { prompt_tokens: 5000, completion_tokens: 3000, total_tokens: 8000 },
        }),
      });

      const result = await provider.complete({
        model: 'deepseek-v3',
        messages: [{ role: 'user', content: 'Write a long story' }],
      });

      expect(result.usage?.promptTokens).toBe(5000);
      expect(result.usage?.completionTokens).toBe(3000);
      expect(result.usage?.totalTokens).toBe(8000);
    });

    it('should handle deepseek-chat basic request', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'ds-chat',
          model: 'deepseek-chat',
          choices: [{
            index: 0,
            message: { role: 'assistant', content: 'Chat response' },
            finish_reason: 'stop',
          }],
        }),
      });

      const result = await provider.complete({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.model).toBe('deepseek-chat');
    });
  });
});
