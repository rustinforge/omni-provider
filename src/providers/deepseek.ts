/**
 * DeepSeek Provider
 */

import type { ChatCompletionRequest, ChatCompletionResponse, ChatMessage, RawChatCompletionResponse, RawChoice } from "../types";
import { BaseLLMProvider } from "./base";

export class DeepSeekProvider extends BaseLLMProvider {
  private baseUrl = 'https://api.deepseek.com/v1';

  constructor() {
    super();
    this.provider = 'deepseek';
    this.name = 'DeepSeek';
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
      stream: false,
    };

    const response = await fetch(`${this.getBaseUrl()}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getApiKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`DeepSeek API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json() as RawChatCompletionResponse;
    
    return {
      id: data.id || this.generateId(),
      model: data.model || request.model,
      choices: data.choices?.map((c: RawChoice) => ({
        index: c.index || 0,
        message: {
          role: (c.message?.role as ChatMessage['role']) || 'assistant',
          content: c.message?.content || '',
        },
        finishReason: (c.finish_reason as ChatCompletionResponse['choices'][0]['finishReason']) || 'stop',
      })) || [],
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens || 0,
        completionTokens: data.usage.completion_tokens || 0,
        totalTokens: data.usage.total_tokens || 0,
      } : undefined,
      created: data.created || Date.now(),
    };
  }
}
