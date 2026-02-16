import type { ChatCompletionRequest, ChatCompletionResponse } from "../../types";
import { BaseLLMProvider } from "./base";

export class AnyscaleProvider extends BaseLLMProvider {
  name = 'Anyscale';
  private baseUrl = 'https://api.endpoints.anyscale.com/v1';
  protected getDefaultBaseUrl(): string { return this.baseUrl; }
  async complete(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    this.ensureInitialized();
    const body: Record<string, unknown> = { model: request.model, messages: request.messages, temperature: request.temperature, max_tokens: request.maxTokens, stream: false };
    const response = await fetch(`${this.getBaseUrl()}/chat/completions`, { method: 'POST', headers: { 'Authorization': `Bearer ${this.getApiKey()}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error(`Anyscale API error: ${response.statusText}`);
    const data = await response.json() as any;
    return { id: data.id || this.generateId(), model: data.model || request.model, choices: data.choices?.map((c: any) => ({ index: c.index||0, message: { role: c.message?.role||'assistant', content: c.message?.content||'' }, finishReason: c.finish_reason||'stop' }))||[], usage: data.usage, created: Date.now() };
  }
}
