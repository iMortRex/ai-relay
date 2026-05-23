// ============================================================
// AI API Relay — Admin Config Store (Vercel KV)
// ============================================================
// Runtime overrides for fallback chains and API keys.
// Falls back to source-code defaults when no KV override exists.

import { withTimeout } from '@/lib/utils/timeout';
import type { ProviderConfig } from '../providers/types';

let _kv: any = null;
let _kvChecked = false;

export function createMemoryMockKV() {
  const store = new Map<string, any>();
  return {
    async get(key: string) {
      return store.get(key) ?? null;
    },
    async set(key: string, value: any) {
      store.set(key, value);
      return 'OK';
    },
    async del(key: string) {
      const existed = store.has(key);
      store.delete(key);
      return existed ? 1 : 0;
    },
    async hgetall(key: string) {
      const val = store.get(key);
      if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        return val;
      }
      return null;
    },
    async hset(key: string, dataOrField: any, value?: any) {
      let current = store.get(key);
      if (typeof current !== 'object' || current === null || Array.isArray(current)) {
        current = {};
        store.set(key, current);
      }
      if (typeof dataOrField === 'object' && dataOrField !== null) {
        Object.assign(current, dataOrField);
      } else if (typeof dataOrField === 'string') {
        current[dataOrField] = value;
      }
      return 1;
    },
    async scan(cursor: number, options?: { match?: string; count?: number }) {
      const keys = Array.from(store.keys());
      const match = options?.match;
      let matched = keys;
      if (match) {
        const regexStr = '^' + match.replace(/[-[\]{}()+?.,\\^$|#\s]/g, '\\$&').replace(/\\\*/g, '.*') + '$';
        const regex = new RegExp(regexStr);
        matched = keys.filter((k) => regex.test(k));
      }
      return [0, matched];
    },
    async hincrby(key: string, field: string, increment: number) {
      let current = store.get(key);
      if (typeof current !== 'object' || current === null || Array.isArray(current)) {
        current = {};
        store.set(key, current);
      }
      const prev = Number(current[field] || 0);
      current[field] = prev + increment;
      return current[field];
    },
    async expire(key: string, seconds: number) {
      return 1;
    },
    async incr(key: string) {
      const prev = Number(store.get(key) || 0);
      const next = prev + 1;
      store.set(key, next);
      return next;
    },
    async sadd(key: string, member: string) {
      let current = store.get(key);
      if (!(current instanceof Set)) {
        current = new Set();
        store.set(key, current);
      }
      const existed = current.has(member);
      current.add(member);
      return existed ? 0 : 1;
    },
    async smembers(key: string) {
      const current = store.get(key);
      if (current instanceof Set) {
        return Array.from(current);
      }
      return [];
    }
  };
}

async function getKV() {
  const g = global as any;
  console.log('[getKV DEBUG]', {
    NODE_ENV: process.env.NODE_ENV,
    KV_REST_API_URL: process.env.KV_REST_API_URL,
    hasMock: !!g._mockKVInstance,
    _kvChecked
  });
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    if (_kv && !_kv._isMock) return _kv;
    try {
      const mod = await import('@vercel/kv');
      _kv = mod.kv || mod.createClient({
        url: process.env.KV_REST_API_URL,
        token: process.env.KV_REST_API_TOKEN,
      });
      return _kv;
    } catch {
      return null;
    }
  }

  if (process.env.NODE_ENV === 'development') {
    if (!g._mockKVInstance) {
      g._mockKVInstance = createMemoryMockKV();
      g._mockKVInstance._isMock = true;
    }
    _kv = g._mockKVInstance;
    return _kv;
  }

  return null;
}


// ── KV Key Prefixes ─────────────────────────────────────────
const PREFIX = {
  fallbacks: 'admin:fallbacks:',   // admin:fallbacks:{provider} → JSON string[]
  keys: 'admin:keys:',             // admin:keys:{provider} → JSON string[] (raw API keys)
  quota: 'admin:quota',            // admin:quota → Hash { dailyLimit, monthlyLimit }
} as const;

/**
 * Safely parses values retrieved from KV, handling both raw JSON strings
 * and automatically deserialized array values (which some KV clients return).
 */
function parseJsonOrArray(val: unknown): string[] | null {
  if (!val) return null;
  if (Array.isArray(val)) {
    return val.filter((item): item is string => typeof item === 'string');
  }
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string');
      }
    } catch {
      // ignore
    }
  }
  return null;
}

// ── Fallback Chain Management ────────────────────────────────

/**
 * Get the fallback chain for a provider.
 * Returns KV override if set, otherwise returns the static fallback from registry.
 */
export async function getFallbackChain(
  providerName: string,
  staticFallbacks?: string[] | string
): Promise<string[]> {
  if ((global as any).__mockFallbackChain) {
    return (global as any).__mockFallbackChain(providerName, staticFallbacks);
  }
  try {
    const kv = await getKV();
    if (kv) {
      const raw = await withTimeout(
        kv.get(`${PREFIX.fallbacks}${providerName}`),
        1000,
        null,
        `getFallbackChain:${providerName}`
      );
      if (raw) {
        const parsed = parseJsonOrArray(raw);
        if (parsed) return parsed;
      }
    }
  } catch {
    // fall through
  }
  // Return static fallback as single-element array, or array if already array, or empty
  if (Array.isArray(staticFallbacks)) return staticFallbacks;
  return staticFallbacks ? [staticFallbacks] : [];
}

/**
 * Set the fallback chain for a provider.
 * Pass empty array to clear all fallbacks.
 */
export async function setFallbackChain(
  providerName: string,
  chain: string[]
): Promise<void> {
  const kv = await getKV();
  if (!kv) {
    throw new Error('KV storage not configured — cannot persist fallback overrides');
  }
  await kv.set(`${PREFIX.fallbacks}${providerName}`, JSON.stringify(chain));
}

/**
 * Reset a provider's fallback chain to static defaults.
 */
export async function clearFallbackChain(providerName: string): Promise<void> {
  const kv = await getKV();
  if (!kv) return;
  await kv.del(`${PREFIX.fallbacks}${providerName}`);
}

// ── API Key Management ───────────────────────────────────────

/**
 * Get managed API keys for a provider.
 * Returns KV override if set, otherwise null (caller should use env vars).
 */
export async function getManagedKeys(providerName: string): Promise<string[] | null> {
  try {
    const kv = await getKV();
    if (kv) {
      const raw = await withTimeout(
        kv.get(`${PREFIX.keys}${providerName}`),
        1000,
        null,
        `getManagedKeys:${providerName}`
      );
      if (raw) {
        const parsed = parseJsonOrArray(raw);
        if (parsed) return parsed;
      }
    }
  } catch {
    // fall through
  }
  return null;
}

/**
 * Get all managed keys for all providers (returns a map of provider → keys[]).
 */
export async function getAllManagedKeys(): Promise<Record<string, string[]>> {
  const kv = await getKV();
  if (!kv) return {};

  try {
    // Scan for all admin:keys:* keys
    const keys: string[] = [];
    let cursor = 0;
    do {
      const result = await withTimeout(
        kv.scan(cursor, { match: 'admin:keys:*', count: 100 }),
        1000,
        [0, []] as [number, string[]],
        'getAllManagedKeys:scan'
      );
      cursor = result[0];
      keys.push(...result[1]);
      if (cursor === 0 || result[1].length === 0) {
        break;
      }
    } while (cursor !== 0);

    const out: Record<string, string[]> = {};
    if (keys.length > 0) {
      const values = await withTimeout(
        Promise.all(keys.map((k: string) => kv.get(k))),
        1000,
        keys.map(() => null),
        'getAllManagedKeys:getValues'
      );
      for (let i = 0; i < keys.length; i++) {
        const provider = keys[i].replace('admin:keys:', '');
        if (values[i]) {
          const parsed = parseJsonOrArray(values[i]);
          if (parsed) {
            out[provider] = parsed;
          }
        }
      }
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * Set the managed API keys for a provider.
 * This OVERRIDES env var keys for this provider when called.
 */
export async function setManagedKeys(
  providerName: string,
  keys: string[]
): Promise<void> {
  const kv = await getKV();
  if (!kv) {
    throw new Error('KV storage not configured — cannot persist key overrides');
  }
  await kv.set(`${PREFIX.keys}${providerName}`, JSON.stringify(keys));
  try {
    const { updateMemoryKeyPool } = await import('../relay/key-pool');
    updateMemoryKeyPool(providerName, keys);
  } catch {
    // ignore
  }
}

/**
 * Add a key to a provider's managed key list.
 * If no managed keys exist yet, bootstraps from env var keys first.
 */
export async function addManagedKey(
  providerName: string,
  newKey: string,
  envKeys: string[] = []
): Promise<string[]> {
  const existing = await getManagedKeys(providerName);
  // Bootstrap from env if no managed keys yet
  const current = existing ?? [...envKeys];
  if (current.includes(newKey)) {
    return current; // already exists
  }
  current.push(newKey);
  await setManagedKeys(providerName, current);
  return current;
}

/**
 * Remove a key from a provider's managed key list.
 * Key can be matched by full value or by hash prefix.
 * If no managed keys exist, bootstraps from env keys first.
 */
export async function removeManagedKey(
  providerName: string,
  keyOrHash: string,
  envKeys: string[] = []
): Promise<string[]> {
  const existing = await getManagedKeys(providerName);
  const current = existing ?? [...envKeys];
  // Try matching by full value first, then by hash
  const filtered = current.filter((k) => k !== keyOrHash);
  if (filtered.length === current.length) {
    throw new Error(`Key not found: ${keyOrHash}`);
  }
  await setManagedKeys(providerName, filtered);
  return filtered;
}

// ── Quota Limit Override Management ─────────────────────────

export interface CustomQuotaConfig {
  dailyLimit: number | null;
  monthlyLimit: number | null;
}

/**
 * Get custom quota override limits from KV.
 * Returns null if no custom quota override is configured.
 */
export async function getCustomQuota(): Promise<CustomQuotaConfig | null> {
  try {
    const kv = await getKV();
    if (kv) {
      const raw = await withTimeout<Record<string, unknown> | null>(
        kv.hgetall(PREFIX.quota),
        1000,
        null,
        'getCustomQuota'
      );
      if (raw && (raw.dailyLimit !== undefined || raw.monthlyLimit !== undefined)) {
        return {
          dailyLimit: raw.dailyLimit !== null && raw.dailyLimit !== undefined && raw.dailyLimit !== '' ? parseInt(String(raw.dailyLimit), 10) : null,
          monthlyLimit: raw.monthlyLimit !== null && raw.monthlyLimit !== undefined && raw.monthlyLimit !== '' ? parseInt(String(raw.monthlyLimit), 10) : null,
        };
      }
    }
  } catch {
    // fall through
  }
  return null;
}

/**
 * Set custom quota override limits in KV.
 */
export async function setCustomQuota(quota: CustomQuotaConfig): Promise<void> {
  const kv = await getKV();
  if (!kv) {
    throw new Error('KV storage not configured — cannot persist quota overrides');
  }
  await kv.hset(PREFIX.quota, {
    dailyLimit: quota.dailyLimit === null ? '' : String(quota.dailyLimit),
    monthlyLimit: quota.monthlyLimit === null ? '' : String(quota.monthlyLimit),
  });
}

/**
 * Clear custom quota overrides and revert to environment variables.
 */
export async function clearCustomQuota(): Promise<void> {
  const kv = await getKV();
  if (!kv) return;
  await kv.del(PREFIX.quota);
}

// ── Webhook Notification Management ──────────────────────────

import type { WebhookConfig, WebhookSettings, WebhookAlertThreshold } from '../webhooks/types';

const WEBHOOK_PREFIX = 'admin:webhooks';      // admin:webhooks → JSON WebhookSettings

const DEFAULT_SETTINGS: WebhookSettings = {
  webhooks: [],
  alertThresholds: [],
  reportTime: '21:00',
  reportTimezone: 'Asia/Shanghai',
};

/**
 * Get all webhook settings from KV.
 */
export async function getWebhookSettings(): Promise<WebhookSettings> {
  try {
    const kv = await getKV();
    if (kv) {
      const raw = await withTimeout(
        kv.get(WEBHOOK_PREFIX),
        1000,
        null,
        'getWebhookSettings'
      );
      if (raw) {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    }
  } catch {
    // fall through
  }
  return { ...DEFAULT_SETTINGS };
}

/**
 * Save the full webhook settings to KV.
 */
export async function saveWebhookSettings(settings: WebhookSettings): Promise<void> {
  const kv = await getKV();
  if (!kv) {
    throw new Error('KV storage not configured — cannot persist webhook settings');
  }
  await kv.set(WEBHOOK_PREFIX, JSON.stringify(settings));
}

/**
 * Add a new webhook config. Returns the new config with generated id.
 */
export async function addWebhook(config: Omit<WebhookConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<WebhookConfig> {
  const settings = await getWebhookSettings();
  const now = new Date().toISOString();
  const newWebhook: WebhookConfig = {
    ...config,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  settings.webhooks.push(newWebhook);
  await saveWebhookSettings(settings);
  return newWebhook;
}

/**
 * Update an existing webhook config by id.
 */
export async function updateWebhook(id: string, updates: Partial<Omit<WebhookConfig, 'id' | 'createdAt'>>): Promise<WebhookConfig | null> {
  const settings = await getWebhookSettings();
  const idx = settings.webhooks.findIndex(w => w.id === id);
  if (idx < 0) return null;
  settings.webhooks[idx] = {
    ...settings.webhooks[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await saveWebhookSettings(settings);
  return settings.webhooks[idx];
}

/**
 * Delete a webhook config by id.
 */
export async function deleteWebhook(id: string): Promise<boolean> {
  const settings = await getWebhookSettings();
  const before = settings.webhooks.length;
  settings.webhooks = settings.webhooks.filter(w => w.id !== id);
  if (settings.webhooks.length === before) return false;
  await saveWebhookSettings(settings);
  return true;
}

/**
 * Update alert thresholds.
 */
export async function saveAlertThresholds(thresholds: WebhookAlertThreshold[]): Promise<void> {
  const settings = await getWebhookSettings();
  settings.alertThresholds = thresholds;
  await saveWebhookSettings(settings);
}

// ── Custom Providers Management ──────────────────────────────

/**
 * Get all custom providers from KV.
 */
export async function getCustomProviders(): Promise<Record<string, ProviderConfig>> {
  try {
    const kv = await getKV();
    if (kv) {
      const raw = await withTimeout(
        kv.get('admin:custom_providers'),
        1000,
        null,
        'getCustomProviders'
      );
      if (raw) {
        if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
          return raw as Record<string, ProviderConfig>;
        }
        if (typeof raw === 'string') {
          return JSON.parse(raw);
        }
      }
    }
  } catch (err) {
    console.error('[getCustomProviders] Error:', err);
  }
  return {};
}

/**
 * Save/upsert a custom provider configuration to KV.
 */
export async function saveCustomProvider(provider: ProviderConfig): Promise<void> {
  const kv = await getKV();
  if (!kv) {
    throw new Error('KV storage not configured — cannot save custom provider');
  }
  const custom = await getCustomProviders();
  custom[provider.name] = {
    ...provider,
    isCustom: true,
  };
  await kv.set('admin:custom_providers', JSON.stringify(custom));
}

/**
 * Delete a custom provider from KV, and clean up its keys and fallback configs.
 */
export async function deleteCustomProvider(name: string): Promise<void> {
  const kv = await getKV();
  if (!kv) {
    throw new Error('KV storage not configured — cannot delete custom provider');
  }
  const custom = await getCustomProviders();
  delete custom[name];
  await kv.set('admin:custom_providers', JSON.stringify(custom));
  // Clean up keys and fallbacks entries
  await kv.del(`admin:keys:${name}`);
  await kv.del(`admin:fallbacks:${name}`);
}

/**
 * Try to decode a base64-encoded API key or JSON service account.
 * Decodes only if the string matches base64 pattern and the output consists
 * entirely of printable ASCII characters or common whitespace.
 */
export function tryDecodeBase64(str: string): string {
  const trimmed = str.trim();
  if (/^[A-Za-z0-9+/=\s]+$/.test(trimmed)) {
    try {
      const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
      if (/^[\x20-\x7E\t\r\n]+$/.test(decoded) && decoded.trim().length > 0) {
        return decoded;
      }
    } catch {
      // ignore
    }
  }
  return str;
}


