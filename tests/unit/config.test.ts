/**
 * Config Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadConfig, mergeConfigs, validateConfig } from '../../src/config/index.js';

describe('Config', () => {
  describe('loadConfig', () => {
    it('should return empty config when no env vars set', () => {
      const config = loadConfig({});
      expect(config).toBeDefined();
    });

    it('should load OpenCode config from env', () => {
      const config = loadConfig({
        OPENCODE_API_KEY: 'test-key',
      });
      expect(config.opencode?.apiKey).toBe('test-key');
    });

    it('should load OpenAI config from env', () => {
      const config = loadConfig({
        OPENAI_API_KEY: 'test-key',
      });
      expect(config.openai?.apiKey).toBe('test-key');
    });

    it('should load Anthropic config from env', () => {
      const config = loadConfig({
        ANTHROPIC_API_KEY: 'test-key',
      });
      expect(config.anthropic?.apiKey).toBe('test-key');
    });

    it('should load Google config from env', () => {
      const config = loadConfig({
        GOOGLE_API_KEY: 'test-key',
      });
      expect(config.google?.apiKey).toBe('test-key');
    });

    it('should load DeepSeek config from env', () => {
      const config = loadConfig({
        DEEPSEEK_API_KEY: 'test-key',
      });
      expect(config.deepseek?.apiKey).toBe('test-key');
    });

    it('should load xAI config from env', () => {
      const config = loadConfig({
        XAI_API_KEY: 'test-key',
      });
      expect(config.xai?.apiKey).toBe('test-key');
    });

    it('should load multiple providers from env', () => {
      const config = loadConfig({
        OPENCODE_API_KEY: 'opencode-key',
        OPENAI_API_KEY: 'openai-key',
        ANTHROPIC_API_KEY: 'anthropic-key',
      });
      expect(config.opencode?.apiKey).toBe('opencode-key');
      expect(config.openai?.apiKey).toBe('openai-key');
      expect(config.anthropic?.apiKey).toBe('anthropic-key');
    });
  });

  describe('mergeConfigs', () => {
    it('should merge two configs', () => {
      const config1 = {
        opencode: { enabled: true, apiKey: 'key1' },
      };
      const config2 = {
        openai: { enabled: true, apiKey: 'key2' },
      };
      const merged = mergeConfigs(config1, config2);
      expect(merged.opencode).toBeDefined();
      expect(merged.openai).toBeDefined();
    });

    it('should override with second config', () => {
      const config1 = {
        opencode: { enabled: true, apiKey: 'key1' },
      };
      const config2 = {
        opencode: { enabled: false, apiKey: 'key2' },
      };
      const merged = mergeConfigs(config1, config2);
      expect(merged.opencode?.enabled).toBe(false);
      expect(merged.opencode?.apiKey).toBe('key2');
    });
  });

  describe('validateConfig', () => {
    it('should validate valid config', () => {
      const config = {
        opencode: { enabled: true, apiKey: 'test-key' },
      };
      const result = validateConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when required provider missing api key', () => {
      const config = {
        opencode: { enabled: true, apiKey: '' },
      };
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should pass when disabled provider missing api key', () => {
      const config = {
        opencode: { enabled: false, apiKey: '' },
      };
      const result = validateConfig(config);
      expect(result.valid).toBe(true);
    });

    it('should validate multiple providers', () => {
      const config = {
        opencode: { enabled: true, apiKey: 'key1' },
        openai: { enabled: true, apiKey: 'key2' },
        anthropic: { enabled: false, apiKey: '' },
      };
      const result = validateConfig(config);
      expect(result.valid).toBe(true);
    });
  });
});
