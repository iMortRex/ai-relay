// ============================================================
// AI API Relay — Config Source Resolver
//
// Resolves configuration source from multiple inputs with priority:
// 1. CLI --config argument
// 2. Environment variables
// 3. Local config file (~/.ai-relay/relay-config.json)
// 4. Stored profile cloudUrl (from login)
// 5. Returns null (triggers interactive prompt)
// ============================================================

import * as fs from 'fs';
import * as path from 'path';
import {
  ConfigSource,
  CloudConfigSource,
  FileConfigSource,
  InlineConfigSource,
  FileConfig,
} from './config-source';
import type { LocalProfile } from '../local/profile';
import { getProfileDir } from '../local/profile';

export interface ResolveConfigOptions {
  /**
   * Explicit config argument from CLI (--config parameter).
   * Can be a URL (http://...) or file path.
   */
  configArg?: string;

  /**
   * Loaded local profile (may contain cloudUrl from login).
   */
  profile?: LocalProfile | null;

  /**
   * Environment variables to check.
   */
  env?: NodeJS.ProcessEnv;
}

/**
 * Resolve a config source from various inputs with priority.
 *
 * Priority order:
 * 1. CLI --config argument (URL or file path)
 * 2. Environment variables (RELAY_CONFIG_URL, RELAY_CONFIG_PATH)
 * 3. Inline config from env vars (OPENAI_KEYS, CLAUDE_KEYS, etc.)
 * 4. Local config file (~/.ai-relay/relay-config.json)
 * 5. Stored profile cloudUrl (from ai-relay login)
 * 6. null (no config source found)
 *
 * @returns ConfigSource or null if no source found
 */
export function resolveConfigSource(options: ResolveConfigOptions): ConfigSource | null {
  const { configArg, profile, env = process.env } = options;

  // 1. CLI --config argument
  if (configArg) {
    return createConfigSourceFromArg(configArg, profile);
  }

  // 2. Environment variables - explicit URL or path
  if (env.RELAY_CONFIG_URL || env.RELAY_CLOUD_URL) {
    const url = env.RELAY_CONFIG_URL || env.RELAY_CLOUD_URL;
    const deviceToken = profile?.deviceToken;
    return new CloudConfigSource(url!, deviceToken);
  }

  if (env.RELAY_CONFIG_PATH) {
    return new FileConfigSource(env.RELAY_CONFIG_PATH);
  }

  // 3. Inline config from environment variables
  const inlineConfig = buildInlineConfigFromEnv(env);
  if (inlineConfig) {
    return new InlineConfigSource(inlineConfig);
  }

  // 4. Local config file (default location)
  const defaultConfigPath = path.join(getProfileDir(), 'relay-config.json');
  if (fs.existsSync(defaultConfigPath)) {
    return new FileConfigSource(defaultConfigPath);
  }

  // 5. Stored profile cloudUrl (from login)
  if (profile?.cloudUrl) {
    return new CloudConfigSource(profile.cloudUrl, profile.deviceToken);
  }

  // 6. No config source found
  return null;
}

/**
 * Create config source from CLI argument.
 * Auto-detects whether it's a URL or file path.
 */
function createConfigSourceFromArg(
  configArg: string,
  profile?: LocalProfile | null
): ConfigSource {
  // Check if it's a URL
  if (configArg.startsWith('http://') || configArg.startsWith('https://')) {
    const deviceToken = profile?.deviceToken;
    return new CloudConfigSource(configArg, deviceToken);
  }

  // Otherwise treat as file path
  // Resolve relative paths from current directory
  const resolvedPath = path.isAbsolute(configArg)
    ? configArg
    : path.resolve(process.cwd(), configArg);

  return new FileConfigSource(resolvedPath);
}

/**
 * Build inline config from environment variables.
 * Supports provider keys and basic routing config.
 */
function buildInlineConfigFromEnv(env: NodeJS.ProcessEnv): FileConfig | null {
  const providers: FileConfig['providers'] = {};
  let hasProviders = false;

  // OpenAI keys
  if (env.OPENAI_KEYS) {
    providers.openai = {
      name: 'OpenAI',
      apiKeys: env.OPENAI_KEYS.split(',').map(k => k.trim()),
      baseUrl: env.OPENAI_BASE_URL || 'https://api.openai.com',
    };
    hasProviders = true;
  }

  // Claude/Anthropic keys
  if (env.CLAUDE_KEYS) {
    providers.anthropic = {
      name: 'Anthropic',
      apiKeys: env.CLAUDE_KEYS.split(',').map(k => k.trim()),
      baseUrl: env.CLAUDE_BASE_URL || 'https://api.anthropic.com',
    };
    hasProviders = true;
  }

  // DeepSeek keys
  if (env.DEEPSEEK_KEYS) {
    providers.deepseek = {
      name: 'DeepSeek',
      apiKeys: env.DEEPSEEK_KEYS.split(',').map(k => k.trim()),
      baseUrl: env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    };
    hasProviders = true;
  }

  // Xiaomi keys
  if (env.XIAOMI_KEYS) {
    providers.xiaomi = {
      name: 'Xiaomi',
      apiKeys: env.XIAOMI_KEYS.split(',').map(k => k.trim()),
      baseUrl: env.XIAOMI_BASE_URL,
    };
    hasProviders = true;
  }

  // Xiaomi Coding keys
  if (env.XIAOMI_CODING_KEYS) {
    providers['xiaomi-coding'] = {
      name: 'Xiaomi Coding',
      apiKeys: env.XIAOMI_CODING_KEYS.split(',').map(k => k.trim()),
      baseUrl: env.XIAOMI_CODING_BASE_URL,
    };
    hasProviders = true;
  }

  // Xiaomimimo SGP Coding keys
  if (env.XIAOMIMIMO_SGP_CODING_KEYS) {
    providers['xiaomimimo-sgp-coding'] = {
      name: 'Xiaomimimo SGP Coding',
      apiKeys: env.XIAOMIMIMO_SGP_CODING_KEYS.split(',').map(k => k.trim()),
      baseUrl: env.XIAOMIMIMO_SGP_CODING_BASE_URL,
    };
    hasProviders = true;
  }

  if (!hasProviders) {
    return null;
  }

  return {
    version: 1,
    providers,
  };
}

/**
 * Get the default config file path.
 */
export function getDefaultConfigPath(): string {
  return path.join(getProfileDir(), 'relay-config.json');
}

/**
 * Check if a config file exists at the default location.
 */
export function hasDefaultConfig(): boolean {
  return fs.existsSync(getDefaultConfigPath());
}
