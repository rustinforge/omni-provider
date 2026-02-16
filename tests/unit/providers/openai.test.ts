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
});
