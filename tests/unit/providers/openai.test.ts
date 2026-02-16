/**
 * OpenAI Provider Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAIProvider } from '../../../src/providers/openai.js';

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;
  let fetchSpy: any;

  const testConfig = {
    enabled: true,
    apiKey: 'test-key',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo', 'o1', 'o1-mini', 'o3-mini', 'gpt-4o-mini'],
  };

  const mockResponse = {
    id: 'chatcmpl-test-123',
    object: 'chat.completion',
    created: Date.now(),
    model: 'gpt-4o',
    choices: [{
      index: 0,
      message: { role: 'assistant', content: 'Hello! How can I help you today?' },
      finish_reason: 'stop',
    }],
    usage: { prompt_tokens: 10, completion_tokens: 8, total_tokens: 18 },
  };

  beforeEach(() => {
    provider = new OpenAIProvider();
    (provider as any).initialized = true;
    (provider as any).config = testConfig;
    
    // Spy on global fetch
    fetchSpy = vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('should have correct provider name', () => {
    expect(provider.name).toBe('OpenAI');
  });

  it('should support gpt-4o model', () => {
    expect(provider.supportsModel('gpt-4o')).toBe(true);
  });

  it('should support gpt-4-turbo model', () => {
    expect(provider.supportsModel('gpt-4-turbo')).toBe(true);
  });

  it('should support gpt-3.5-turbo model', () => {
    expect(provider.supportsModel('gpt-3.5-turbo')).toBe(true);
  });

  it('should support o1 model', () => {
    expect(provider.supportsModel('o1')).toBe(true);
  });

  it('should not support unknown models', () => {
    expect(provider.supportsModel('claude-3-opus')).toBe(false);
    expect(provider.supportsModel('gemini-pro')).toBe(false);
  });

  it('should return correct base URL', () => {
    expect(provider.getDefaultBaseUrl()).toBe('https://api.openai.com/v1');
  });

  it('should throw if not initialized', async () => {
    const uninitialized = new OpenAIProvider();
    await expect(uninitialized.complete({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
    })).rejects.toThrow('Not initialized');
  });

  describe('complete() with mock API', () => {
    it('should make API call with correct request body', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await provider.complete({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
        maxTokens: 1000,
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      
      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toBe('https://api.openai.com/v1/chat/completions');
      expect(options.method).toBe('POST');
      expect(options.headers['Authorization']).toBe('Bearer test-key');
      expect(options.headers['Content-Type']).toBe('application/json');
      
      const body = JSON.parse(options.body);
      expect(body.model).toBe('gpt-4o');
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
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.id).toBe('chatcmpl-test-123');
      expect(result.model).toBe('gpt-4o');
      expect(result.choices).toHaveLength(1);
      expect(result.choices[0].message.content).toBe('Hello! How can I help you today?');
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
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello' }],
      })).rejects.toThrow('OpenAI API error: Invalid API key');
    });

    it('should include tools in request when provided', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const tools = [{
        type: 'function' as const,
        function: {
          name: 'get_weather',
          description: 'Get weather for a location',
          parameters: {
            type: 'object',
            properties: {
              location: { type: 'string', description: 'City name' },
            },
            required: ['location'],
          },
        },
      }];

      await provider.complete({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'What is the weather in Tokyo?' }],
        tools,
      });

      const [, options] = fetchSpy.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.tools).toStrictEqual(tools);
    });

    it('should include reasoning effort when provided', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await provider.complete({
        model: 'o1',
        messages: [{ role: 'user', content: 'Solve this problem' }],
        reasoning: { effort: 'high' },
      });

      const [, options] = fetchSpy.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.reasoning_effort).toBe('high');
    });
  });

  describe('stream() with mock API', () => {
    it('should make streaming API call', async () => {
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
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello' }],
      })) {
        chunks.push(chunk);
      }

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [, options] = fetchSpy.mock.calls[0];
      expect(options.body).toContain('"stream":true');
    });
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
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello' }],
      })).rejects.toThrow('OpenAI API error: Rate limit exceeded');
    });

    it('should handle rate limit with different limit types', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: () => Promise.resolve({ error: { message: 'You exceeded your current quota' } }),
      });

      await expect(provider.complete({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello' }],
      })).rejects.toThrow();
    });
  });

  describe('Invalid Request Handling (400)', () => {
    it('should handle invalid model error', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ error: { message: 'Model not found' } }),
      });

      await expect(provider.complete({
        model: 'gpt-5-fake',
        messages: [{ role: 'user', content: 'Hello' }],
      })).rejects.toThrow();
    });

    it('should handle invalid parameter error', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ error: { message: "Invalid parameter: 'temperature' must be between 0 and 2" } }),
      });

      await expect(provider.complete({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 5.0,
      })).rejects.toThrow();
    });

    it('should handle missing required parameter', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ error: { message: 'messages is required' } }),
      });

      await expect(provider.complete({
        model: 'gpt-4o',
        messages: [],
      } as any)).rejects.toThrow();
    });
  });

  describe('Token Usage Tracking', () => {
    it('should track detailed usage information', async () => {
      const detailedResponse = {
        id: 'chatcmpl-test',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4o',
        choices: [{ index: 0, message: { role: 'assistant', content: 'Response' }, finish_reason: 'stop' }],
        usage: {
          prompt_tokens: 250,
          completion_tokens: 100,
          total_tokens: 350,
          prompt_tokens_details: { cached_tokens: 100 },
          completion_tokens_details: { reasoning_tokens: 50 },
        },
      };

      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(detailedResponse),
      });

      const result = await provider.complete({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.usage?.promptTokens).toBe(250);
      expect(result.usage?.completionTokens).toBe(100);
      expect(result.usage?.totalTokens).toBe(350);
    });

    it('should handle usage for different models', async () => {
      const models = ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo', 'o1', 'o1-mini'];
      
      for (const model of models) {
        fetchSpy.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({
            id: `test-${model}`,
            model,
            choices: [{ index: 0, message: { role: 'assistant', content: 'Response' }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 },
          }),
        });

        const result = await provider.complete({
          model,
          messages: [{ role: 'user', content: 'Test' }],
        });

        expect(result.usage?.totalTokens).toBe(70);
      }
    });

    it('should handle zero usage in response', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'chatcmpl-test',
          model: 'gpt-4o',
          choices: [{ index: 0, message: { role: 'assistant', content: '' }, finish_reason: 'length' }],
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        }),
      });

      const result = await provider.complete({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: '' }],
        maxTokens: 1,
      });

      expect(result.usage?.totalTokens).toBe(0);
    });
  });

  describe('Different Model Variants', () => {
    it('should handle gpt-4o model correctly', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'test-gpt-4o',
          model: 'gpt-4o',
          choices: [{ index: 0, message: { role: 'assistant', content: 'Response' }, finish_reason: 'stop' }],
        }),
      });

      const result = await provider.complete({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }],
      });
      expect(result.model).toBe('gpt-4o');
    });

    it('should handle o1 reasoning model', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'test-o1',
          model: 'o1',
          choices: [{ index: 0, message: { role: 'assistant', content: 'Reasoning response' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
        }),
      });

      const result = await provider.complete({
        model: 'o1',
        messages: [{ role: 'user', content: 'Solve this' }],
      });

      expect(result.model).toBe('o1');
      expect(result.usage?.totalTokens).toBe(150);
    });

    it('should handle o1-mini model with reasoning_effort', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'test-o1-mini',
          model: 'o1-mini',
          choices: [{ index: 0, message: { role: 'assistant', content: 'Quick reasoning' }, finish_reason: 'stop' }],
        }),
      });

      await provider.complete({
        model: 'o1-mini',
        messages: [{ role: 'user', content: 'Quick calc' }],
        reasoning: { effort: 'low' },
      });

      const [, options] = fetchSpy.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.reasoning_effort).toBe('low');
    });

    it('should handle gpt-4o-mini model', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'test-mini',
          model: 'gpt-4o-mini',
          choices: [{ index: 0, message: { role: 'assistant', content: 'Mini response' }, finish_reason: 'stop' }],
        }),
      });

      const result = await provider.complete({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Hi' }],
      });
      expect(result.model).toBe('gpt-4o-mini');
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
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello' }],
      })).rejects.toThrow();
    });

    it('should handle service unavailable (503)', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: () => Promise.resolve({ error: { message: 'Service is currently unavailable' } }),
      });

      await expect(provider.complete({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello' }],
      })).rejects.toThrow();
    });

    it('should handle network error', async () => {
      fetchSpy.mockRejectedValue(new Error('Network request failed'));

      await expect(provider.complete({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello' }],
      })).rejects.toThrow();
    });

    it('should handle API key errors (401)', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ error: { message: 'Incorrect API key provided' } }),
      });

      await expect(provider.complete({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello' }],
      })).rejects.toThrow();
    });

    it('should handle context length exceeded (400)', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ error: { message: 'Maximum context length exceeded' } }),
      });

      await expect(provider.complete({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Very long '.repeat(10000) }],
      })).rejects.toThrow();
    });
  });

  describe('Streaming Edge Cases', () => {
    it('should handle empty stream', async () => {
      const streamMock = {
        getReader: () => ({
          read: vi.fn().mockResolvedValueOnce({ done: true, value: new TextEncoder().encode('') }),
        }),
      };

      fetchSpy.mockResolvedValue({
        ok: true,
        body: streamMock,
      });

      const chunks: any[] = [];
      for await (const chunk of provider.stream({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }],
      })) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(0);
    });

    it('should handle stream with multiple chunks', async () => {
      const streamMock = {
        getReader: () => ({
          read: vi.fn()
            .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Hello "}}]}\n\n') })
            .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"World"}}]}\n\n') })
            .mockResolvedValueOnce({ done: true, value: new TextEncoder().encode('data: [DONE]') }),
        }),
      };

      fetchSpy.mockResolvedValue({
        ok: true,
        body: streamMock,
      });

      const chunks: any[] = [];
      for await (const chunk of provider.stream({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }],
      })) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBe(2);
      expect(chunks[0].choices[0].delta.content).toBe('Hello ');
      expect(chunks[1].choices[0].delta.content).toBe('World');
    });

    it('should handle stream with finish_reason', async () => {
      const streamMock = {
        getReader: () => ({
          read: vi.fn()
            .mockResolvedValueOnce({ 
              done: false, 
              value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Response"},"finish_reason":"stop"}]}\n\n') 
            })
            .mockResolvedValueOnce({ done: true, value: new TextEncoder().encode('data: [DONE]') }),
        }),
      };

      fetchSpy.mockResolvedValue({
        ok: true,
        body: streamMock,
      });

      const chunks: any[] = [];
      for await (const chunk of provider.stream({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }],
      })) {
        chunks.push(chunk);
      }

      expect(chunks[0].choices[0].finishReason).toBe('stop');
    });
  });

  describe('Response Format / JSON Mode', () => {
    it('should handle response_format parameter', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'test-json',
          model: 'gpt-4o',
          choices: [{ index: 0, message: { role: 'assistant', content: '{"key": "value"}' }, finish_reason: 'stop' }],
        }),
      });

      await provider.complete({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Return JSON' }],
        responseFormat: { type: 'json_object' },
      });

      const [, options] = fetchSpy.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.response_format).toEqual({ type: 'json_object' });
    });
  });

  describe('Timeout Handling', () => {
    it('should handle request timeout', async () => {
      fetchSpy.mockRejectedValue(new Error('The request timed out'));

      await expect(provider.complete({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello' }],
      })).rejects.toThrow();
    });
  });

  describe('Additional Request Parameters', () => {
    it('should pass top_p parameter', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'test',
          model: 'gpt-4o',
          choices: [{ index: 0, message: { role: 'assistant', content: 'Response' }, finish_reason: 'stop' }],
        }),
      });

      await provider.complete({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }],
        topP: 0.9,
      });

      const [, options] = fetchSpy.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.top_p).toBe(0.9);
    });

    it('should pass presence_penalty parameter', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'test',
          model: 'gpt-4o',
          choices: [{ index: 0, message: { role: 'assistant', content: 'Response' }, finish_reason: 'stop' }],
        }),
      });

      await provider.complete({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }],
        presencePenalty: 0.5,
      });

      const [, options] = fetchSpy.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.presence_penalty).toBe(0.5);
    });

    it('should pass frequency_penalty parameter', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'test',
          model: 'gpt-4o',
          choices: [{ index: 0, message: { role: 'assistant', content: 'Response' }, finish_reason: 'stop' }],
        }),
      });

      await provider.complete({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }],
        frequencyPenalty: 0.5,
      });

      const [, options] = fetchSpy.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.frequency_penalty).toBe(0.5);
    });

    it('should pass logprobs parameter', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'test',
          model: 'gpt-4o',
          choices: [{ index: 0, message: { role: 'assistant', content: 'Response' }, finish_reason: 'stop', logprobs: { content: [{ logprob: -0.5 }] } }],
        }),
      });

      await provider.complete({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }],
        logprobs: 1,
      });

      const [, options] = fetchSpy.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.logprobs).toBe(1);
    });
  });
});
