/**
 * Model Resolution Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { resolveModelAlias, getModel, getModelsByProvider, getFreeModels, MODELS, MODEL_ALIASES } from '../../src/models';

describe('Model Resolution', () => {
  describe('resolveModelAlias', () => {
    it('should resolve "sonnet" alias to claude-sonnet-4', () => {
      expect(resolveModelAlias('sonnet')).toBe('claude-sonnet-4');
    });

    it('should resolve "opus" alias to claude-opus-4', () => {
      expect(resolveModelAlias('opus')).toBe('claude-opus-4');
    });

    it('should resolve "haiku" alias to claude-haiku-4', () => {
      expect(resolveModelAlias('haiku')).toBe('claude-haiku-4');
    });

    it('should resolve "gpt" alias to gpt-4o', () => {
      expect(resolveModelAlias('gpt')).toBe('gpt-4o');
    });

    it('should resolve "gpt-mini" alias to gpt-4o-mini', () => {
      expect(resolveModelAlias('gpt-mini')).toBe('gpt-4o-mini');
    });

    it('should resolve "flash" alias to gemini-2.5-flash', () => {
      expect(resolveModelAlias('flash')).toBe('gemini-2.5-flash');
    });

    it('should resolve "pro" alias to gemini-2.5-pro', () => {
      expect(resolveModelAlias('pro')).toBe('gemini-2.5-pro');
    });

    it('should resolve "deepseek" alias to deepseek-v3', () => {
      expect(resolveModelAlias('deepseek')).toBe('deepseek-v3');
    });

    it('should resolve "grok" alias to grok-3', () => {
      expect(resolveModelAlias('grok')).toBe('grok-3');
    });

    it('should resolve "kimi" alias to kimi-k2.5', () => {
      expect(resolveModelAlias('kimi')).toBe('kimi-k2.5');
    });

    it('should resolve "big-pickle" to big-pickle', () => {
      expect(resolveModelAlias('big-pickle')).toBe('big-pickle');
    });

    it('should resolve "reasoner" to o3-mini', () => {
      expect(resolveModelAlias('reasoner')).toBe('o3-mini');
    });

    it('should resolve "reasoning" to o3', () => {
      expect(resolveModelAlias('reasoning')).toBe('o3');
    });

    it('should return unknown alias as-is', () => {
      expect(resolveModelAlias('unknown-model')).toBe('unknown-model');
    });
  });

  describe('getModel', () => {
    it('should return model info for gpt-4o', () => {
      const model = getModel('gpt-4o');
      expect(model).toBeDefined();
      expect(model?.id).toBe('gpt-4o');
      expect(model?.provider).toBe('openai');
    });

    it('should return model info for big-pickle', () => {
      const model = getModel('big-pickle');
      expect(model).toBeDefined();
      expect(model?.provider).toBe('opencode');
      expect(model?.pricing.input).toBe(0);
    });

    it('should return undefined for unknown model', () => {
      expect(getModel('unknown-model')).toBeUndefined();
    });
  });

  describe('getModelsByProvider', () => {
    it('should return all OpenAI models', () => {
      const models = getModelsByProvider('openai');
      expect(models.length).toBeGreaterThan(0);
      expect(models.every(m => m.provider === 'openai')).toBe(true);
    });

    it('should return all OpenCode models', () => {
      const models = getModelsByProvider('opencode');
      expect(models.length).toBe(4); // big-pickle, gpt-5-nano, kimi-k2.5-free, minimax-m2.5-free
      expect(models.every(m => m.provider === 'opencode')).toBe(true);
    });
  });

  describe('getFreeModels', () => {
    it('should return models with zero input pricing', () => {
      const freeModels = getFreeModels();
      expect(freeModels.length).toBeGreaterThan(0);
      expect(freeModels.every(m => m.pricing?.input === 0)).toBe(true);
    });

    it('should include OpenCode models', () => {
      const freeModels = getFreeModels();
      const opencodeModels = freeModels.filter(m => m.provider === 'opencode');
      expect(opencodeModels.length).toBe(4);
    });
  });

  describe('MODELS', () => {
    it('should have pricing for most models', () => {
      Object.values(MODELS).forEach(model => {
        // OpenRouter auto model doesn't have pricing as it's a meta-provider
        if (model.provider !== 'openrouter') {
          expect(model.pricing).toBeDefined();
          expect(typeof model.pricing.input).toBe('number');
          expect(typeof model.pricing.output).toBe('number');
        }
      });
    });

    it('should have capabilities for all models', () => {
      Object.values(MODELS).forEach(model => {
        expect(model.capabilities).toBeDefined();
        expect(typeof model.capabilities.streaming).toBe('boolean');
      });
    });

    it('should have context window for all models', () => {
      Object.values(MODELS).forEach(model => {
        expect(model.contextWindow).toBeGreaterThan(0);
      });
    });
  });

  describe('MODEL_ALIASES', () => {
    it('should have unique aliases', () => {
      const aliases = MODEL_ALIASES.map(a => a.alias);
      const uniqueAliases = new Set(aliases);
      expect(aliases.length).toBe(uniqueAliases.size);
    });
  });
});
