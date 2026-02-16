/**
 * Azure OpenAI Provider
 */

import type { ChatCompletionRequest, ChatCompletionResponse } from "../types";
import { BaseLLMProvider } from "./base";

export class AzureProvider extends BaseLLMProvider {
  name = 'Azure';
  protected getDefaultBaseUrl(): string {
    return this.config.baseUrl || '';
  }

  async complete(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    this.ensureInitialized();

    const body: Record<string, unknown> = {
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      stream: false,
    };

    const deploymentName = request.model;
    const url = `${this.getBaseUrl()}/openai/deployments/${deploymentName}/chat/completions?api-version=2024-02-15-preview`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'api-key': this.getApiKey(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Azure API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json() as any;
    
    return {
      id: data.id || this.generateId(),
      model: data.model || request.model,
      choices: data.choices?.map((c: any) => ({
        index: c.index || 0,
        message: { role: c.message?.role || 'assistant', content: c.message?.content || '' },
        finishReason: c.finish_reason || 'stop',
      })) || [],
      usage: data.usage,
      created: Date.now(),
    };
  }
}
