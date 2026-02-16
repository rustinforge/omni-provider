/**
 * Fireworks Provider Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FireworksProvider } from '../../../src/providers/fireworks.js';

describe('FireworksProvider', () => {
  let provider: FireworksProvider;
  let fetchSpy: any;

  const testConfig = {
    enabled: true,
    apiKey: 'test-key',
    models: ['accounts/fireworks/models/llama-v3-70b-instruct', 'accounts/fireworks/models/llama-v3-8b-instruct'],
  };

  const mockResponse = {
    id: 'fireworks-chatcmpl-123',
    object: 'chat.completion',
    created: Date.now(),
    model: 'accounts/fireworks/models/llama-v3-70b-instruct',
    choices: [{
      index: 0,
      message: { role: 'assistant', content: 'Hello from Fireworks!' },
      finish_reason: 'stop',
    }],
    usage: { prompt_tokens: 10, completion_tokens: 12, total_tokens: 22 },
  };

  beforeEach(() => {
    provider = new FireworksProvider();
    (provider as any).initialized = true;
    (provider as any).config = testConfig;
    
    // Spy on global fetch
    fetchSpy = vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('should have correct provider name', () => {
    expect(provider.name).toBe('Fireworks');
  });

  it('should support Llama v3 70b model', () => {
    expect(provider.supportsModel('accounts/fireworks/models/llama-v3-70b-instruct')).toBe(true);
  });

  it('should support Llama v3 8b model', () => {
    expect(provider.supportsModel('accounts/fireworks/models/llama-v3-8b-instruct')).toBe(true);
  });

  it('should not support unknown models', () => {
    expect(provider.supportsModel('gpt-4o')).toBe(false);
    expect(provider.supportsModel('claude-opus-4')).toBe(false);
  });

  it('should return correct base URL', () => {
    expect(provider.getDefaultBaseUrl()).toBe('https://api.fireworks.ai/inference/v1');
  });

  it('should throw if not initialized', async () => {
    const uninitialized = new FireworksProvider();
    await expect(uninitialized.complete({
      model: 'accounts/fireworks/models/llama-v3-70b-instruct',
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
        model: 'accounts/fireworks/models/llama-v3-70b-instruct',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
        maxTokens: 1000,
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      
      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toBe('https://api.fireworks.ai/inference/v1/chat/completions');
      expect(options.method).toBe('POST');
      expect(options.headers['Authorization']).toBe('Bearer test-key');
      expect(options.headers['Content-Type']).toBe('application/json');
      
      const body = JSON.parse(options.body);
      expect(body.model).toBe('accounts/fireworks/models/llama-v3-70b-instruct');
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
        model: 'accounts/fireworks/models/llama-v3-70b-instruct',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.id).toBe('fireworks-chatcmpl-123');
      expect(result.model).toBe('accounts/fireworks/models/llama-v3-70b-instruct');
      expect(result.choices).toHaveLength(1);
      expect(result.choices[0].message.content).toBe('Hello from Fireworks!');
      expect(result.choices[0].message.role).toBe('assistant');
      expect(result.choices[0].finishReason).toBe('stop');
      expect(result.usage?.promptTokens).toBe(10);
      expect(result.usage?.completionTokens).toBe(12);
      expect(result.usage?.totalTokens).toBe(22);
    });

    it('should handle API errors correctly', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ error: { message: 'Invalid API key' } }),
      });

      await expect(provider.complete({
        model: 'accounts/fireworks/models/llama-v3-70b-instruct',
        messages: [{ role: 'user', content: 'Hello' }],
      })).rejects.toThrow('Fireworks API error: Unauthorized');
    });

    it('should handle rate limiting errors', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: () => Promise.resolve({ error: { message: 'Rate limit exceeded' } }),
      });

      await expect(provider.complete({
        model: 'accounts/fireworks/models/llama-v3-70b-instruct',
        messages: [{ role: 'user', content: 'Hello' }],
      })).rejects.toThrow('Fireworks API error: Too Many Requests');
    });

    it('should handle server errors', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ error: { message: 'Server error' } }),
      });

      await expect(provider.complete({
        model: 'accounts/fireworks/models/llama-v3-70b-instruct',
        messages: [{ role: 'user', content: 'Hello' }],
      })).rejects.toThrow('Fireworks API error: Internal Server Error');
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
        model: 'accounts/fireworks/models/llama-v3-70b-instruct',
        messages: [{ role: 'user', content: 'What is the weather?' }],
        tools,
      });

      const [url, options] = fetchSpy.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.tools).toEqual(tools);
    });

    it('should handle multiple messages in conversation', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const messages = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'user', content: 'How are you?' },
      ];

      await provider.complete({
        model: 'accounts/fireworks/models/llama-v3-70b-instruct',
        messages,
      });

      const [url, options] = fetchSpy.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.messages).toEqual(messages);
    });

    it('should handle response with no id (generate one)', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          model: 'accounts/fireworks/models/llama-v3-70b-instruct',
          choices: [{
            index: 0,
            message: { role: 'assistant', content: 'Hello' },
            finish_reason: 'stop',
          }],
        }),
      });

      const result = await provider.complete({
        model: 'accounts/fireworks/models/llama-v3-70b-instruct',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.id).toBeDefined();
      expect(result.id.length).toBeGreaterThan(0);
    });

    it('should handle empty choices response', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'test-id',
          model: 'accounts/fireworks/models/llama-v3-70b-instruct',
          choices: [],
        }),
      });

      const result = await provider.complete({
        model: 'accounts/fireworks/models/llama-v3-70b-instruct',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.choices).toHaveLength(0);
    });
  });
});
