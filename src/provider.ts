/**
 * OmniLLM ProviderPlugin for OpenClaw
 * 
 * Registers OmniLLM as an LLM provider in OpenClaw.
 * Uses a local proxy to handle smart routing to provider APIs.
 */

import type { ProviderPlugin } from "./types/openclaw.js";
import { buildProviderModels } from "./models.js";

// Default proxy port
const DEFAULT_PORT = 8403;

export function getProxyPort(): number {
  const envPort = process.env.OMNI_LLM_PORT;
  if (envPort) {
    const parsed = parseInt(envPort, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed < 65536) return parsed;
  }
  return DEFAULT_PORT;
}

export const omniLLMProvider: ProviderPlugin = {
  id: "omni-llm",
  label: "OmniLLM",
  docsPath: "https://github.com/omni-llm/omni-provider",
  aliases: ["omni"],
  envVars: [
    "OPENROUTER_API_KEY",
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "GOOGLE_API_KEY",
    "XAI_API_KEY",
    "DEEPSEEK_API_KEY",
    "MOONSHOT_API_KEY",
    "OPENCODE_API_KEY",
  ],

  get models() {
    const port = getProxyPort();
    return buildProviderModels(`http://127.0.0.1:${port}`);
  },

  auth: [],
};
