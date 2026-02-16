/**
 * Google Provider (Gemini)
 */

import type { ChatCompletionRequest, ChatCompletionResponse } from "../types";
import { BaseLLMProvider } from "./base";

export class GoogleProvider extends BaseLLMProvider {
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor() {
    super();
    this.provider = 'google';
    this.name = 'Google';
  }

  protected getDefaultBaseUrl(): string {
    return this.baseUrl;
  }

  async complete(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    this.ensureInitialized();

    const model = this.mapModel(request.model);
    const messages = this.convertMessages(request.messages);

    const body: Record<string, unknown> = {
      contents: messages,
      generationConfig: {
        temperature: request.temperature,
        maxOutputTokens: request.maxTokens,
        topP: request.topP,
      },
    };

    const url = `${this.getBaseUrl()}/models/${model}:generateContent?key=${this.getApiKey()}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Google API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json() as any;
    
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    return {
      id: data.id || this.generateId(),
      model: data.modelVersion || request.model,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content,
        },
        finishReason: data.candidates?.[0]?.finishReason || 'STOP',
      }],
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0,
      },
      created: Date.now(),
    };
  }

  private mapModel(model: string): string {
    const mapping: Record<string, string> = {
      'gemini-2.5-pro': 'gemini-2.5-pro-preview-0605',
      'gemini-2.5-flash': 'gemini-2.5-flash-preview-0605',
      'gemini-1.5-pro': 'gemini-1.5-pro',
      'gemini-1.5-flash': 'gemini-1.5-flash',
      'pro': 'gemini-2.5-pro-preview-0605',
      'flash': 'gemini-2.5-flash-preview-0605',
    };
    return mapping[model] || model;
  }

  private convertMessages(messages: any[]): any[] {
    return messages.map(m => ({
      role: m.role === 'system' ? 'user' : m.role,
      parts: [{ text: m.content }],
    }));
  }
}
