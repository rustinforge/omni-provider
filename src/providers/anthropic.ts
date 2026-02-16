/**
 * Anthropic Provider
 */

import type { ChatCompletionRequest, ChatCompletionResponse } from "../types";
import { BaseLLMProvider } from "./base";

// Anthropic uses a different API format
export class AnthropicProvider extends BaseLLMProvider {
  private baseUrl = 'https://api.anthropic.com/v1';

  constructor() {
    super();
    this.provider = 'anthropic';
    this.name = 'Anthropic';
  }

  protected getDefaultBaseUrl(): string {
    return this.baseUrl;
  }

  async complete(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    this.ensureInitialized();

    // Convert OpenAI format to Anthropic format
    const systemMessage = request.messages.find(m => m.role === 'system');
    const userMessages = request.messages.filter(m => m.role !== 'system');
    
    const body: Record<string, unknown> = {
      model: this.mapModel(request.model),
      max_tokens: request.maxTokens || 4096,
      temperature: request.temperature,
      messages: userMessages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    };

    if (systemMessage) {
      body.system = systemMessage.content;
    }

    const response = await fetch(`${this.getBaseUrl()}/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': this.getApiKey(),
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json() as any;
    
    return {
      id: data.id || this.generateId(),
      model: data.model || request.model,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: data.content?.[0]?.text || '',
        },
        finishReason: data.stop_reason || 'stop',
      }],
      usage: data.usage ? {
        promptTokens: data.usage.input_tokens || 0,
        completionTokens: data.usage.output_tokens || 0,
        totalTokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0),
      } : undefined,
      created: Date.now(),
    };
  }

  private mapModel(model: string): string {
    const mapping: Record<string, string> = {
      'claude-sonnet-4': 'claude-sonnet-4-20250514',
      'claude-opus-4': 'claude-opus-4-20251114',
      'claude-haiku-4': 'claude-haiku-4-20250704',
      'sonnet': 'claude-sonnet-4-20250514',
      'opus': 'claude-opus-4-20251114',
      'haiku': 'claude-haiku-4-20250704',
    };
    return mapping[model] || model;
  }
}
