/**
 * NVIDIA Provider Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NVIDIAProvider } from '../../../src/providers/nvidia.js';

describe('NVIDIAProvider', () => {
  let provider: NVIDIAProvider;
  let fetchSpy: any;

  const testConfig = {
    enabled: true,
    apiKey: 'nvidia-test-key',
    models: ['z-ai/glm5', 'nvidia/llama-3.1-nemotron-70b-instruct', 'nvidia/mistral-large'],
  };

  const mockResponse = {
    id: 'nvidia-chatcmpl-123',
    object: 'chat.completion',
    created: Date.now(),
    model: 'z-ai/glm5',
    choices: [{
      index: 0,
      message: { role: 'assistant', content: 'Hello from NVIDIA NIM!' },
      finish_reason: 'stop',
    }],
    usage: { prompt_tokens: 10, completion_tokens: 8, total_tokens: 18 },
  };

  beforeEach(() => {
    provider = new NVIDIAProvider();
    (provider as any).initialized = true;
    (provider as any).config = testConfig;
    
    fetchSpy = vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('should have correct provider name', () => {
    expect(provider.name).toBe('NVIDIA Build');
  });

  it('should have correct provider id', () => {
    expect(provider.provider).toBe('nvidia');
  });

  it('should support GLM-5 model', () => {
    expect(provider.supportsModel('z-ai/glm5')).toBe(true);
  });

  it('should support Nemotron 70B model', () => {
    expect(provider.supportsModel('nvidia/llama-3.1-nemotron-70b-instruct')).toBe(true);
  });

  it('should support Mistral Large model', () => {
    expect(provider.supportsModel('nvidia/mistral-large')).toBe(true);
  });

  it('should not support unknown models', () => {
    expect(provider.supportsModel('gpt-4o')).toBe(false);
    expect(provider.supportsModel('claude-opus-4')).toBe(false);
  });

  it('should return correct base URL', () => {
    expect(provider.getDefaultBaseUrl()).toBe('https://integrate.api.nvidia.com/v1');
  });

  it('should throw if not initialized', async () => {
    const uninitialized = new NVIDIAProvider();
    await expect(uninitialized.complete({
      model: 'z-ai/glm5',
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
        model: 'z-ai/glm5',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9,
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      
      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toBe('https://integrate.api.nvidia.com/v1/chat/completions');
      expect(options.method).toBe('POST');
      expect(options.headers['Authorization']).toBe('Bearer nvidia-test-key');
      expect(options.headers['Content-Type']).toBe('application/json');
      
      const body = JSON.parse(options.body);
      expect(body.model).toBe('z-ai/glm5');
      expect(body.messages).toEqual([{ role: 'user', content: 'Hello' }]);
      expect(body.temperature).toBe(0.7);
      expect(body.max_tokens).toBe(1000);
      expect(body.top_p).toBe(0.9);
      expect(body.stream).toBe(false);
    });

    it('should return correctly parsed response', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await provider.complete({
        model: 'z-ai/glm5',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.id).toBe('nvidia-chatcmpl-123');
      expect(result.model).toBe('z-ai/glm5');
      expect(result.choices).toHaveLength(1);
      expect(result.choices[0].message.content).toBe('Hello from NVIDIA NIM!');
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
        model: 'z-ai/glm5',
        messages: [{ role: 'user', content: 'Hello' }],
      })).rejects.toThrow('NVIDIA API error: Invalid API key');
    });

    it('should handle rate limiting errors (429)', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: () => Promise.resolve({ error: { message: 'Rate limit exceeded' } }),
      });

      await expect(provider.complete({
        model: 'z-ai/glm5',
        messages: [{ role: 'user', content: 'Hello' }],
      })).rejects.toThrow('NVIDIA API error: Rate limit exceeded');
    });

    it('should handle server errors (500)', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ error: { message: 'Internal server error' } }),
      });

      await expect(provider.complete({
        model: 'z-ai/glm5',
        messages: [{ role: 'user', content: 'Hello' }],
      })).rejects.toThrow('NVIDIA API error: Internal server error');
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
        model: 'z-ai/glm5',
        messages: [{ role: 'user', content: 'What is the weather in Tokyo?' }],
        tools,
      });

      const [, options] = fetchSpy.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.tools).toStrictEqual(tools);
    });

    it('should include tool_choice when provided', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await provider.complete({
        model: 'z-ai/glm5',
        messages: [{ role: 'user', content: 'Call a tool' }],
        toolChoice: { type: 'function', function: { name: 'get_weather' } },
      });

      const [, options] = fetchSpy.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.tool_choice).toEqual({ type: 'function', function: { name: 'get_weather' } });
    });

    it('should include response_format when provided', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await provider.complete({
        model: 'z-ai/glm5',
        messages: [{ role: 'user', content: 'Return JSON' }],
        responseFormat: { type: 'json_object' },
      });

      const [, options] = fetchSpy.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.response_format).toEqual({ type: 'json_object' });
    });

    it('should handle response with tool_calls', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'nvidia-test-tool',
          model: 'z-ai/glm5',
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: '',
              tool_calls: [{
                id: 'call_123',
                type: 'function',
                function: { name: 'get_weather', arguments: '{"location":"Tokyo"}' },
              }],
            },
            finish_reason: 'tool_calls',
          }],
          usage: { prompt_tokens: 50, completion_tokens: 30, total_tokens: 80 },
        }),
      });

      const result = await provider.complete({
        model: 'z-ai/glm5',
        messages: [{ role: 'user', content: 'What is the weather?' }],
      });

      expect(result.choices[0].finishReason).toBe('tool_calls');
      expect(result.choices[0].message.toolCalls).toHaveLength(1);
      expect(result.choices[0].message.toolCalls?.[0].function.name).toBe('get_weather');
    });

    it('should handle response without usage data', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'nvidia-nousage',
          model: 'z-ai/glm5',
          choices: [{
            index: 0,
            message: { role: 'assistant', content: 'No usage data' },
            finish_reason: 'stop',
          }],
        }),
      });

      const result = await provider.complete({
        model: 'z-ai/glm5',
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(result.usage).toBeUndefined();
      expect(result.choices[0].message.content).toBe('No usage data');
    });

    it('should generate id when response lacks one', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          model: 'z-ai/glm5',
          choices: [{
            index: 0,
            message: { role: 'assistant', content: 'No ID response' },
            finish_reason: 'stop',
          }],
        }),
      });

      const result = await provider.complete({
        model: 'z-ai/glm5',
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(result.id).toBeDefined();
      expect(result.id.length).toBeGreaterThan(0);
    });

    it('should handle empty choices array', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'nvidia-empty',
          model: 'z-ai/glm5',
          choices: [],
        }),
      });

      const result = await provider.complete({
        model: 'z-ai/glm5',
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(result.choices).toHaveLength(0);
    });
  });

  describe('stream() with mock API', () => {
    it('should make streaming API call', async () => {
      const streamMock = {
        getReader: () => ({
          read: vi.fn()
            .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: {"id":"stream-1","choices":[{"delta":{"content":"Hello"}}]}\n\n') })
            .mockResolvedValueOnce({ done: true, value: new TextEncoder().encode('data: [DONE]') }),
        }),
      };

      fetchSpy.mockResolvedValue({
        ok: true,
        body: streamMock,
      });

      const chunks: any[] = [];
      for await (const chunk of provider.stream({
        model: 'z-ai/glm5',
        messages: [{ role: 'user', content: 'Hello' }],
      })) {
        chunks.push(chunk);
      }

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [, options] = fetchSpy.mock.calls[0];
      expect(JSON.parse(options.body).stream).toBe(true);
    });

    it('should yield stream chunks correctly', async () => {
      const streamMock = {
        getReader: () => ({
          read: vi.fn()
            .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: {"id":"s1","choices":[{"delta":{"content":"Hello "}}]}\n\n') })
            .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: {"id":"s2","choices":[{"delta":{"content":"World"}}]}\n\n') })
            .mockResolvedValueOnce({ done: true, value: new TextEncoder().encode('data: [DONE]') }),
        }),
      };

      fetchSpy.mockResolvedValue({
        ok: true,
        body: streamMock,
      });

      const chunks: any[] = [];
      for await (const chunk of provider.stream({
        model: 'z-ai/glm5',
        messages: [{ role: 'user', content: 'Say hello' }],
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
            .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: {"id":"s1","choices":[{"delta":{"content":"Response"},"finish_reason":"stop"}]}\n\n') })
            .mockResolvedValueOnce({ done: true, value: new TextEncoder().encode('data: [DONE]') }),
        }),
      };

      fetchSpy.mockResolvedValue({
        ok: true,
        body: streamMock,
      });

      const chunks: any[] = [];
      for await (const chunk of provider.stream({
        model: 'z-ai/glm5',
        messages: [{ role: 'user', content: 'Hi' }],
      })) {
        chunks.push(chunk);
      }

      expect(chunks[0].choices[0].finishReason).toBe('stop');
    });

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
        model: 'z-ai/glm5',
        messages: [{ role: 'user', content: 'Hi' }],
      })) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(0);
    });

    it('should throw on streaming API error', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        statusText: 'Service Unavailable',
      });

      await expect(async () => {
        for await (const _ of provider.stream({
          model: 'z-ai/glm5',
          messages: [{ role: 'user', content: 'Hi' }],
        })) {
          // consume
        }
      }).rejects.toThrow('NVIDIA API error: Service Unavailable');
    });

    it('should throw if no response body', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        body: undefined,
      });

      await expect(async () => {
        for await (const _ of provider.stream({
          model: 'z-ai/glm5',
          messages: [{ role: 'user', content: 'Hi' }],
        })) {
          // consume
        }
      }).rejects.toThrow('No response body');
    });
  });

  describe('with different models', () => {
    it('should work with Nemotron 70B', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'nvidia-nemotron',
          model: 'nvidia/llama-3.1-nemotron-70b-instruct',
          choices: [{ index: 0, message: { role: 'assistant', content: 'Nemotron response' }, finish_reason: 'stop' }],
        }),
      });

      const result = await provider.complete({
        model: 'nvidia/llama-3.1-nemotron-70b-instruct',
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(result.model).toBe('nvidia/llama-3.1-nemotron-70b-instruct');
      expect(result.choices[0].message.content).toBe('Nemotron response');
    });

    it('should work with Mistral Large', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'nvidia-mistral',
          model: 'nvidia/mistral-large',
          choices: [{ index: 0, message: { role: 'assistant', content: 'Mistral response' }, finish_reason: 'stop' }],
        }),
      });

      const result = await provider.complete({
        model: 'nvidia/mistral-large',
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(result.model).toBe('nvidia/mistral-large');
      expect(result.choices[0].message.content).toBe('Mistral response');
    });
  });
});

