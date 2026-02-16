import type { ChatCompletionRequest, ChatCompletionResponse } from "../../types";
import { BaseLLMProvider } from "./base";
export class CohereProvider extends BaseLLMProvider {
  private baseUrl = 'https://api.cohere.ai/v1';
  protected getDefaultBaseUrl(): string { return this.baseUrl; }
  constructor() {
    super();
    this.provider = 'cohere';
    this.name = 'Cohere';
  }
  async complete(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    this.ensureInitialized();
    const body: Record<string, unknown> = { model: request.model, messages: request.messages, temperature: request.temperature, max_tokens: request.maxTokens, stream: false };
    const response = await fetch(`${this.getBaseUrl()}/chat`, { method: 'POST', headers: { 'Authorization': `Bearer ${this.getApiKey()}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error(`Cohere API error: ${response.statusText}`);
    const data = await response.json() as any;
    return { id: data.id || this.generateId(), model: data.model || request.model, choices: [{ index: 0, message: { role: 'assistant', content: data.text||'' }, finishReason: 'stop' }], usage: data.usage, created: Date.now() };
  }
}
