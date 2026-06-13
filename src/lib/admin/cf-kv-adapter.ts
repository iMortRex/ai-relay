// ============================================================
// AI API Relay — Cloudflare KV Adapter
// ============================================================
// Wraps a CF KV namespace binding to expose the same interface
// used by admin-config.ts (which was written for @vercel/kv).
// CF KV only supports simple get/put/delete/list — no hashes,
// no sets, no pipelines. We emulate them with JSON serialization.

import type { KVNamespace } from '@cloudflare/workers-types';

export class CFKVAdapter {
  constructor(private kv: KVNamespace) {}

  async get(key: string): Promise<any> {
    const raw = await this.kv.get(key, 'text');
    if (raw === null) return null;
    try { return JSON.parse(raw); } catch { return raw; }
  }

  async set(key: string, value: any, options?: { ex?: number }): Promise<string> {
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    // Honor Vercel-KV-style `{ ex: seconds }` TTL via CF KV's expirationTtl.
    // CF KV requires expirationTtl >= 60; smaller values are dropped (no expiry).
    if (options?.ex && options.ex >= 60) {
      await this.kv.put(key, str, { expirationTtl: options.ex });
    } else {
      await this.kv.put(key, str);
    }
    return 'OK';
  }

  async del(key: string): Promise<number> {
    await this.kv.delete(key);
    return 1;
  }

  async hgetall(key: string): Promise<Record<string, unknown> | null> {
    const raw = await this.kv.get(key, 'text');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch { /* ignore */ }
    return null;
  }

  async hset(key: string, dataOrField: any, value?: any): Promise<number> {
    const current = await this.hgetall(key) || {};
    if (typeof dataOrField === 'object' && dataOrField !== null) {
      Object.assign(current, dataOrField);
    } else if (typeof dataOrField === 'string') {
      current[dataOrField] = value;
    }
    await this.kv.put(key, JSON.stringify(current));
    return 1;
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    const current = await this.hgetall(key) || {};
    const prev = Number(current[field] || 0);
    current[field] = prev + increment;
    await this.kv.put(key, JSON.stringify(current));
    return current[field] as number;
  }

  async incr(key: string): Promise<number> {
    return this.incrby(key, 1);
  }

  async incrby(key: string, increment: number): Promise<number> {
    const raw = await this.kv.get(key, 'text');
    const next = Number(raw || 0) + increment;
    await this.kv.put(key, String(next));
    return next;
  }

  async sadd(key: string, member: string): Promise<number> {
    const raw = await this.kv.get(key, 'text');
    const set: string[] = raw ? JSON.parse(raw) : [];
    if (set.includes(member)) return 0;
    set.push(member);
    await this.kv.put(key, JSON.stringify(set));
    return 1;
  }

  async smembers(key: string): Promise<string[]> {
    const raw = await this.kv.get(key, 'text');
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  }

  async srem(key: string, member: string): Promise<number> {
    const raw = await this.kv.get(key, 'text');
    if (!raw) return 0;
    const set: string[] = JSON.parse(raw);
    const filtered = set.filter(m => m !== member);
    if (filtered.length === set.length) return 0;
    await this.kv.put(key, JSON.stringify(filtered));
    return 1;
  }

  async expire(_key: string, _seconds: number): Promise<number> {
    // CF KV supports TTL via expirationTtl on put, but we don't re-put here.
    // Config data doesn't need expiry — return 1 for compatibility.
    return 1;
  }

  async mget(...keysOrArray: Array<string | string[]>): Promise<any[]> {
    const keys = Array.isArray(keysOrArray[0]) ? keysOrArray[0] as string[] : keysOrArray as string[];
    return Promise.all(keys.map(k => this.get(k)));
  }

  async scan(_cursor: number, options?: { match?: string; count?: number }): Promise<[number, string[]]> {
    const prefix = options?.match?.replace(/\*$/, '') ?? '';
    const list = await this.kv.list({ prefix });
    return [0, list.keys.map(k => k.name)];
  }

  pipeline() {
    const commands: Array<() => Promise<any>> = [];
    const self = this;
    const proxy: any = new Proxy({}, {
      get(_target, prop) {
        if (prop === 'exec') {
          return async () => Promise.all(commands.map(cmd => cmd()));
        }
        const method = (self as any)[prop];
        if (typeof method === 'function') {
          return (...args: any[]) => {
            commands.push(() => method.apply(self, args));
            return proxy;
          };
        }
        throw new Error(`CFKVAdapter pipeline: method not implemented: ${String(prop)}`);
      }
    });
    return proxy;
  }
}
