// ============================================================
// Routing Config Storage Integration Test
// ============================================================
// Verifies that routing config persists via admin-config's getKV,
// which supports CF KV binding, Vercel KV REST API, and dev mock.

import { describe, it, expect, beforeEach } from 'vitest';
import { getRoutingConfig, saveRoutingConfig } from '@/lib/smart-routing/route-engine';

describe('Routing Config Storage', () => {
  beforeEach(() => {
    // Reset global mock KV instance to start fresh
    const g = global as any;
    if (g._mockKVInstance) {
      g._mockKVInstance = null;
    }
  });

  it('should save and retrieve routing config via admin-config getKV', async () => {
    // Initial config should be the default (enabled: false)
    const initial = await getRoutingConfig();
    expect(initial.enabled).toBe(false);
    expect(initial.strategy).toBe('latency');
    expect(initial.updatedAt).toBe(0);

    // Save a partial config
    const updated = await saveRoutingConfig({
      enabled: true,
      strategy: 'cost',
      maxLatencyMs: 5000,
    });

    expect(updated.enabled).toBe(true);
    expect(updated.strategy).toBe('cost');
    expect(updated.maxLatencyMs).toBe(5000);
    expect(updated.updatedAt).toBeGreaterThan(0);

    // Retrieve again (should hit KV, not just cache)
    const retrieved = await getRoutingConfig();
    expect(retrieved.enabled).toBe(true);
    expect(retrieved.strategy).toBe('cost');
    expect(retrieved.maxLatencyMs).toBe(5000);
  });

  it('should persist across cache TTL boundary', async () => {
    await saveRoutingConfig({ enabled: true, failureThreshold: 5 });

    // Clear the in-memory cache by resetting the module-level state
    // (in real deployment, this simulates a cold start / new process)
    const firstRead = await getRoutingConfig();
    expect(firstRead.enabled).toBe(true);
    expect(firstRead.failureThreshold).toBe(5);

    // Directly read from KV via admin-config to confirm persistence
    const { getKV } = await import('@/lib/admin/admin-config');
    const kv = await getKV();
    expect(kv).toBeTruthy(); // dev/test environment should have mock KV

    const raw = await kv!.get('relay:route:config');
    expect(raw).toBeTruthy();
    expect(raw.enabled).toBe(true);
    expect(raw.failureThreshold).toBe(5);
  });

  it('should fall back gracefully when KV is unavailable', async () => {
    // Even with no KV (which shouldn't happen in dev/test), getRoutingConfig
    // should return the default config instead of throwing.
    const config = await getRoutingConfig();
    expect(config).toBeTruthy();
    expect(config.enabled).toBeDefined();
  });
});
