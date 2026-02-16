/**
 * OpenRouter Provider
 * 
 * OpenRouter meta-provider - routes to many models.
 */

import type { ChatCompletionRequest, ChatCompletionResponse } from "../types";
import { BaseLLMProvider } from "./base";

export class OpenRouterProvider extends BaseLLMProvider {
  private baseUrl = 'https://openrouter.ai/api/v1';

  constructor() {
    super();
    this.provider = 'openrouter';
    this.name = 'OpenRouter';
  }

  protected getDefaultBaseUrl(): string {
    return this.baseUrl;
  }

  async complete(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    this.ensureInitialized();

    const body: Record<string, unknown> = {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      top_p: request.topP,
      stream: false,
    };

    if (request.tools) {
      body.tools = request.tools;
    }

    if (request.responseFormat) {
      body.response_format = request.responseFormat;
    }

    const response = await fetch(`${this.getBaseUrl()}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getApiKey()}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://openclaw.ai',
        'X-Title': 'OpenClaw',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`OpenRouter API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json() as any;
    
    return {
      id: data.id || this.generateId(),
      model: data.model || request.model,
      choices: data.choices?.map((c: any) => ({
        index: c.index || 0,
        message: {
          role: c.message?.role || 'assistant',
          content: c.message?.content || '',
          toolCalls: c.message?.tool_calls,
        },
        finishReason: c.finish_reason || 'stop',
      })) || [],
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens || 0,
        completionTokens: data.usage.completion_tokens || 0,
        totalTokens: data.usage.total_tokens || 0,
      } : undefined,
      created: data.created || Date.now(),
    };
  }

  async *stream(request: ChatCompletionRequest): AsyncGenerator<any> {
    this.ensureInitialized();

    const body: Record<string, unknown> = {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      stream: true,
    };

    const response = await fetch(`${this.getBaseUrl()}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getApiKey()}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://openclaw.ai',
        'X-Title': 'OpenClaw',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        if (trimmed === 'data: [DONE]') return;

        try {
          const data = JSON.parse(trimmed.slice(6));
          yield {
            id: data.id,
            choices: [{
              index: 0,
              delta: data.choices?.[0]?.delta || {},
              finishReason: data.choices?.[0]?.finish_reason,
            }],
          };
        } catch { /* ignore */ }
      }
    }
  }
}
