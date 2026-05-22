// ============================================================
// AI API Relay — Provider Registry
// ============================================================

import type { ProviderConfig } from './types';

/**
 * All supported providers and their configurations.
 * To add a new provider, just add an entry here.
 */
export const PROVIDERS: Record<string, ProviderConfig> = {
  // ⚠️ lpgpt 排在 openai 前面，gpt-5.x 走 lpgpt，gpt-4o 等走 OpenAI
  lpgpt: {
    name: 'lpgpt',
    displayName: 'LPGPT (GPT-5)',
    baseUrl: 'https://lpgpt.us/v1',
    modelPrefixes: ['gpt-5.'],
    headerFormat: 'openai',
    envKeyField: 'LPGPT_KEYS',
    envBaseUrlField: 'LPGPT_BASE_URL',
    models: [
      { id: 'gpt-5.3', displayName: 'GPT-5.3', contextWindow: 128000, maxOutput: 16384, supportsStream: true, supportsVision: true, supportsTools: true },
      { id: 'gpt-5.4', displayName: 'GPT-5.4', contextWindow: 128000, maxOutput: 16384, supportsStream: true, supportsVision: true, supportsTools: true },
      { id: 'gpt-5.5', displayName: 'GPT-5.5', contextWindow: 128000, maxOutput: 16384, supportsStream: true, supportsVision: true, supportsTools: true },
    ],
  },
  openai: {
    name: 'openai',
    displayName: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    modelPrefixes: ['gpt-', 'o1-', 'o3-', 'o4-', 'chatgpt-', 'dall-e-'],
    headerFormat: 'openai',
    envKeyField: 'OPENAI_KEYS',
    envBaseUrlField: 'OPENAI_BASE_URL',
    models: [
      { id: 'gpt-4o', displayName: 'GPT-4o', contextWindow: 128000, maxOutput: 16384, supportsStream: true, supportsVision: true, supportsTools: true, pricing: { input: 2.5, output: 10 } },
      { id: 'gpt-4o-mini', displayName: 'GPT-4o Mini', contextWindow: 128000, maxOutput: 16384, supportsStream: true, supportsVision: true, supportsTools: true, pricing: { input: 0.15, output: 0.6 } },
      { id: 'gpt-4-turbo', displayName: 'GPT-4 Turbo', contextWindow: 128000, maxOutput: 4096, supportsStream: true, supportsVision: true, supportsTools: true, pricing: { input: 10, output: 30 } },
      { id: 'o1', displayName: 'o1', contextWindow: 200000, maxOutput: 100000, supportsStream: true, supportsTools: true },
      { id: 'o1-mini', displayName: 'o1 Mini', contextWindow: 128000, maxOutput: 65536, supportsStream: true },
      { id: 'o3', displayName: 'o3', contextWindow: 200000, maxOutput: 100000, supportsStream: true, supportsVision: true, supportsTools: true },
      { id: 'o3-mini', displayName: 'o3 Mini', contextWindow: 200000, maxOutput: 100000, supportsStream: true, supportsTools: true },
      { id: 'o4-mini', displayName: 'o4 Mini', contextWindow: 200000, maxOutput: 100000, supportsStream: true, supportsVision: true, supportsTools: true },
      { id: 'chatgpt-4o-latest', displayName: 'ChatGPT-4o Latest', contextWindow: 128000, maxOutput: 16384, supportsStream: true, supportsVision: true, supportsTools: true },
      { id: 'gpt-3.5-turbo', displayName: 'GPT-3.5 Turbo', contextWindow: 16385, maxOutput: 4096, supportsStream: true, supportsTools: true, pricing: { input: 0.5, output: 1.5 } },
    ],
  },
  anthropic: {
    name: 'anthropic',
    displayName: 'Anthropic (Claude)',
    baseUrl: 'https://api.anthropic.com/v1',
    modelPrefixes: ['claude-'],
    headerFormat: 'anthropic',
    envKeyField: 'CLAUDE_KEYS',
    envBaseUrlField: 'CLAUDE_BASE_URL',
    models: [
      { id: 'claude-opus-4-20250514', displayName: 'Claude Opus 4', contextWindow: 200000, maxOutput: 32000, supportsStream: true, supportsVision: true, supportsTools: true, pricing: { input: 15, output: 75 } },
      { id: 'claude-sonnet-4-20250514', displayName: 'Claude Sonnet 4', contextWindow: 200000, maxOutput: 16000, supportsStream: true, supportsVision: true, supportsTools: true, pricing: { input: 3, output: 15 } },
      { id: 'claude-3-5-sonnet-20241022', displayName: 'Claude 3.5 Sonnet', contextWindow: 200000, maxOutput: 8192, supportsStream: true, supportsVision: true, supportsTools: true, pricing: { input: 3, output: 15 } },
      { id: 'claude-3-5-haiku-20241022', displayName: 'Claude 3.5 Haiku', contextWindow: 200000, maxOutput: 8192, supportsStream: true, supportsVision: true, supportsTools: true, pricing: { input: 0.8, output: 4 } },
      { id: 'claude-3-opus-20240229', displayName: 'Claude 3 Opus', contextWindow: 200000, maxOutput: 4096, supportsStream: true, supportsVision: true, supportsTools: true, pricing: { input: 15, output: 75 } },
    ],
  },
  deepseek: {
    name: 'deepseek',
    displayName: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    modelPrefixes: ['deepseek-'],
    headerFormat: 'openai',
    envKeyField: 'DEEPSEEK_KEYS',
    envBaseUrlField: 'DEEPSEEK_BASE_URL',
    models: [
      { id: 'deepseek-chat', displayName: 'DeepSeek V3', contextWindow: 64000, maxOutput: 8192, supportsStream: true, supportsTools: true, pricing: { input: 0.27, output: 1.1 } },
      { id: 'deepseek-reasoner', displayName: 'DeepSeek R1', contextWindow: 64000, maxOutput: 8192, supportsStream: true, pricing: { input: 0.55, output: 2.19 } },
    ],
  },
  // ⚠️ xiaomimimo 排在 xiaomi 前面，同为 mimo- 前缀时优先匹配
  xiaomimimo: {
    name: 'xiaomimimo',
    displayName: 'MiMo SGP (新加坡)',
    baseUrl: 'https://token-plan-sgp.xiaomimimo.com/v1',
    modelPrefixes: ['mimo-'],
    headerFormat: 'azure',
    envKeyField: 'XIAOMIMIMO_SGP_KEYS',
    envBaseUrlField: 'XIAOMIMIMO_SGP_BASE_URL',
    models: [
      { id: 'mimo-v2.5-pro', displayName: 'MiMo v2.5 Pro', contextWindow: 128000, maxOutput: 16384, supportsStream: true, supportsTools: true },
      { id: 'mimo-v2.5-flash', displayName: 'MiMo v2.5 Flash', contextWindow: 128000, maxOutput: 16384, supportsStream: true },
    ],
  },
  xiaomi: {
    name: 'xiaomi',
    displayName: 'MiMo CN (中国)',
    baseUrl: 'https://api.xiaomi.com/v1',
    modelPrefixes: ['mimo-'],
    headerFormat: 'openai',
    envKeyField: 'XIAOMI_KEYS',
    envBaseUrlField: 'XIAOMI_BASE_URL',
    models: [
      { id: 'mimo-v2.5-pro', displayName: 'MiMo v2.5 Pro (CN)', contextWindow: 128000, maxOutput: 16384, supportsStream: true, supportsTools: true },
    ],
  },
};

/** Known provider names (for usage trend queries etc.) */
export const PROVIDER_NAMES = Object.keys(PROVIDERS);
