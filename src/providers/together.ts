import type { ChatCompletionRequest, ChatCompletionResponse, RawChatCompletionResponse, RawChoice } from "../types";
import { BaseLLMProvider } from "./base";

export class TogetherProvider extends BaseLLMProvider {
  name = 'Together';
  private baseUrl = 'https://api.together.xyz/v1';

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
      stream: false
    };

    const response = await fetch(`${this.getBaseUrl()}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getApiKey()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) throw new Error(`Together API error: ${response.statusText}`);

    const data = await response.json() as RawChatCompletionResponse;

    return {
      id: data.id || this.generateId(),
      model: data.model || request.model,
      choices: data.choices?.map((c: RawChoice) => ({
        index: c.index||0,
        message: {
          role: (c.message?.role||'assistant') as 'system' | 'user' | 'assistant' | 'tool',
          content: c.message?.content||''
        },
        finishReason: (c.finish_reason as ChatCompletionResponse['choices'][0]['finishReason'])||'stop'
      }))||[],
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens || 0,
        completionTokens: data.usage.completion_tokens || 0,
        totalTokens: data.usage.total_tokens || 0,
      } : undefined,
      created: Date.now()
    };
  }
}
