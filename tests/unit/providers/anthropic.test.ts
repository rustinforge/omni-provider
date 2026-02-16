/**
 * Anthropic Provider Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnthropicProvider } from '../../../src/providers/anthropic.js';

describe('AnthropicProvider', () => {
  let provider: AnthropicProvider;
  let fetchSpy: any;

  const testConfig = {
    enabled: true,
    apiKey: 'test-key',
    baseUrl: 'https://api.anthropic.com/v1',
    models: ['claude-opus-4', 'claude-sonnet-4', 'claude-haiku-4', 'sonnet', 'opus', 'haiku'],
  };

  const mockResponse = {
    id: 'msg_test_123',
    type: 'message',
    role: 'assistant',
    content: [{ type: 'text', text: 'Hello! I am Claude, how can I help you today?' }],
    model: 'claude-sonnet-4-20250514',
    stop_reason: 'end_turn',
    usage: { input_tokens: 15, output_tokens: 12 },
  };

  beforeEach(() => {
    provider = new AnthropicProvider();
    (provider as any).initialized = true;
    (provider as any).config = testConfig;
    
    // Spy on global fetch
    fetchSpy = vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('should have correct provider name', () => {
    expect(provider.name).toBe('Anthropic');
  });

  it('should support claude-opus-4 model', () => {
    expect(provider.supportsModel('claude-opus-4')).toBe(true);
  });

  it('should support claude-sonnet-4 model', () => {
    expect(provider.supportsModel('claude-sonnet-4')).toBe(true);
  });

  it('should support claude-haiku-4 model', () => {
    expect(provider.supportsModel('claude-haiku-4')).toBe(true);
  });

  it('should support alias sonnet', () => {
    expect(provider.supportsModel('sonnet')).toBe(true);
  });

  it('should support alias opus', () => {
    expect(provider.supportsModel('opus')).toBe(true);
  });

  it('should support alias haiku', () => {
    expect(provider.supportsModel('haiku')).toBe(true);
  });

  it('should not support unknown models', () => {
    expect(provider.supportsModel('gpt-4o')).toBe(false);
    expect(provider.supportsModel('gemini-pro')).toBe(false);
  });

  it('should return correct base URL', () => {
    expect(provider.getDefaultBaseUrl()).toBe('https://api.anthropic.com/v1');
  });

  it('should throw if not initialized', async () => {
    const uninitialized = new AnthropicProvider();
    await expect(uninitialized.complete({
      model: 'claude-sonnet-4',
      messages: [{ role: 'user', content: 'Hello' }],
    })).rejects.toThrow('Not initialized');
  });

  describe('complete() with mock API', () => {
    it('should make API call with correct Anthropic headers', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await provider.complete({
        model: 'claude-sonnet-4',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
        maxTokens: 4096,
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      
      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toBe('https://api.anthropic.com/v1/messages');
      expect(options.method).toBe('POST');
      expect(options.headers['x-api-key']).toBe('test-key');
      expect(options.headers['anthropic-version']).toBe('2023-06-01');
      expect(options.headers['Content-Type']).toBe('application/json');
    });

    it('should map model names correctly', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await provider.complete({
        model: 'sonnet',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      const [, options] = fetchSpy.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.model).toBe('claude-sonnet-4-20250514');
    });

    it('should map opus to full model name', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await provider.complete({
        model: 'opus',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      const [, options] = fetchSpy.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.model).toBe('claude-opus-4-20251114');
    });

    it('should map haiku to full model name', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await provider.complete({
        model: 'haiku',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      const [, options] = fetchSpy.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.model).toBe('claude-haiku-4-20250704');
    });

    it('should extract system message and convert to Anthropic format', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await provider.complete({
        model: 'claude-sonnet-4',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello' },
        ],
      });

      const [, options] = fetchSpy.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.system).toBe('You are a helpful assistant.');
      expect(body.messages).toEqual([
        { role: 'user', content: 'Hello' },
      ]);
    });

    it('should return correctly parsed response', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await provider.complete({
        model: 'claude-sonnet-4',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.id).toBe('msg_test_123');
      expect(result.model).toBe('claude-sonnet-4-20250514');
      expect(result.choices).toHaveLength(1);
      expect(result.choices[0].message.content).toBe('Hello! I am Claude, how can I help you today?');
      expect(result.choices[0].finishReason).toBe('end_turn');
      expect(result.usage?.promptTokens).toBe(15);
      expect(result.usage?.completionTokens).toBe(12);
      expect(result.usage?.totalTokens).toBe(27);
    });

    it('should handle API errors correctly', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ error: { message: 'Invalid API Key' } }),
      });

      await expect(provider.complete({
        model: 'claude-sonnet-4',
        messages: [{ role: 'user', content: 'Hello' }],
      })).rejects.toThrow('Anthropic API error: Invalid API Key');
    });

    it('should handle rate limit errors', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: () => Promise.resolve({ error: { message: 'Rate limit exceeded' } }),
      });

      await expect(provider.complete({
        model: 'claude-sonnet-4',
        messages: [{ role: 'user', content: 'Hello' }],
      })).rejects.toThrow('Anthropic API error: Rate limit exceeded');
    });

    it('should use default max_tokens if not specified', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await provider.complete({
        model: 'claude-sonnet-4',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      const [, options] = fetchSpy.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.max_tokens).toBe(4096);
    });

    it('should convert assistant role correctly', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await provider.complete({
        model: 'claude-sonnet-4',
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
          { role: 'user', content: 'How are you?' },
        ],
      });

      const [, options] = fetchSpy.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.messages).toEqual([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'user', content: 'How are you?' },
      ]);
    });
  });
});
