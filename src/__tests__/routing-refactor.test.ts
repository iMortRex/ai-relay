import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { providerSupportsModel } from '../lib/providers/resolver';
import { routeByStrategy } from '../lib/smart-routing/strategy';
import * as resolver from '../lib/providers';
import { relayRequest } from '../lib/relay/relay';
import type { ProviderConfig } from '../lib/providers/types';
import type { ProviderHealthInfo, LatencyStats, RoutingConfig } from '../lib/smart-routing/types';
import { DEFAULT_ROUTING_CONFIG } from '../lib/smart-routing/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function provider(partial: Partial<ProviderConfig> & Pick<ProviderConfig, 'name' | 'modelPrefixes'>): ProviderConfig {
  return {
    displayName: partial.name,
    baseUrl: 'https://example.com/v1',
    headerFormat: 'openai',
    envKeyField: `${partial.name.toUpperCase()}_KEYS`,
    ...partial,
  } as ProviderConfig;
}

function health(partial: Partial<ProviderHealthInfo> & Pick<ProviderHealthInfo, 'provider'>): ProviderHealthInfo {
  return {
    displayName: partial.provider,
    status: 'healthy',
    avgLatencyMs: 100,
    successRate: 1,
    consecutiveFailures: 0,
    lastFailureAt: 0,
    lastSuccessAt: Date.now(),
    availableKeys: 1,
    totalKeys: 1,
    ...partial,
  };
}

function latency(provider: string, p50: number): LatencyStats {
  return {
    provider,
    avgLatencyMs: p50,
    p50LatencyMs: p50,
    p95LatencyMs: p50,
    sampleCount: 10,
    lastUpdated: Date.now(),
  };
}

function latencyConfig(overrides: Partial<RoutingConfig> = {}): RoutingConfig {
  return { ...DEFAULT_ROUTING_CONFIG, enabled: true, strategy: 'latency', updatedAt: Date.now(), ...overrides };
}

// ---------------------------------------------------------------------------
// providerSupportsModel — smart routing candidate filtering
// ---------------------------------------------------------------------------

describe('providerSupportsModel', () => {
  it('matches a wildcard prefix (claude- serves claude-sonnet-4-6)', () => {
    const p = provider({ name: 'anthropic', modelPrefixes: ['claude-'] });
    expect(providerSupportsModel(p, 'claude-sonnet-4-6')).toBe(true);
  });

  it('rejects a model the provider does not serve (claude on a gpt-only provider)', () => {
    const p = provider({ name: 'openai', modelPrefixes: ['gpt-', 'o1-', 'o3-'] });
    expect(providerSupportsModel(p, 'claude-sonnet-4-6')).toBe(false);
  });

  it('matches an exact (non-wildcard) prefix only on full equality', () => {
    const p = provider({ name: 'exact', modelPrefixes: ['gpt-5.4'] });
    expect(providerSupportsModel(p, 'gpt-5.4')).toBe(true);
    // Non-wildcard prefix must equal the model exactly, not be a string prefix
    expect(providerSupportsModel(p, 'gpt-5.4-mini')).toBe(false);
  });

  it('matches an exact model id from the provider models list', () => {
    const p = provider({
      name: 'custom',
      modelPrefixes: ['unrelated-'],
      models: [{ id: 'special-model-v1', displayName: 'Special', contextWindow: 128000 }],
    });
    expect(providerSupportsModel(p, 'special-model-v1')).toBe(true);
    expect(providerSupportsModel(p, 'other-model')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// routeByStrategy — preferred-provider tolerance
// ---------------------------------------------------------------------------

describe('routeByStrategy preferred-provider tolerance', () => {
  const healthMap = new Map<string, ProviderHealthInfo>([
    ['fast', health({ provider: 'fast' })],
    ['preferred', health({ provider: 'preferred' })],
  ]);

  it('keeps the preferred provider when within tolerance', async () => {
    // preferred (110ms) is 10% slower than fast (100ms); default tolerance is 20%
    const latencyMap = new Map<string, LatencyStats>([
      ['fast', latency('fast', 100)],
      ['preferred', latency('preferred', 110)],
    ]);
    const decision = await routeByStrategy(latencyConfig(), healthMap, 'preferred', latencyMap);
    expect(decision.provider).toBe('preferred');
    // The other candidate becomes the fallback chain
    expect(decision.fallbackChain).toEqual(['fast']);
  });

  it('switches away when the preferred provider exceeds tolerance', async () => {
    // preferred (150ms) is 50% slower than fast (100ms); exceeds default 20%
    const latencyMap = new Map<string, LatencyStats>([
      ['fast', latency('fast', 100)],
      ['preferred', latency('preferred', 150)],
    ]);
    const decision = await routeByStrategy(latencyConfig(), healthMap, 'preferred', latencyMap);
    expect(decision.provider).toBe('fast');
    expect(decision.fallbackChain).toEqual(['preferred']);
  });

  it('honors a custom tolerance percent', async () => {
    const latencyMap = new Map<string, LatencyStats>([
      ['fast', latency('fast', 100)],
      ['preferred', latency('preferred', 150)],
    ]);
    // With a 60% tolerance, the 50%-slower preferred provider is kept
    const decision = await routeByStrategy(
      latencyConfig({ preferredProviderTolerancePercent: 60 }),
      healthMap,
      'preferred',
      latencyMap,
    );
    expect(decision.provider).toBe('preferred');
  });

  it('never keeps a down preferred provider regardless of tolerance', async () => {
    const downHealthMap = new Map<string, ProviderHealthInfo>([
      ['fast', health({ provider: 'fast' })],
      ['preferred', health({ provider: 'preferred', status: 'down' })],
    ]);
    const latencyMap = new Map<string, LatencyStats>([
      ['fast', latency('fast', 100)],
      ['preferred', latency('preferred', 100)],
    ]);
    const decision = await routeByStrategy(
      latencyConfig({ preferredProviderTolerancePercent: 100 }),
      downHealthMap,
      'preferred',
      latencyMap,
    );
    expect(decision.provider).toBe('fast');
  });
});

// ---------------------------------------------------------------------------
// relayRequest fallback sourcing — traditional mode vs smart routing
// ---------------------------------------------------------------------------

describe('relayRequest fallback sourcing', () => {
  let providersSpy: any;

  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'test');
    providersSpy = vi.spyOn(resolver, 'getAllProviders').mockResolvedValue({
      anthropic: provider({ name: 'anthropic', displayName: 'Anthropic', modelPrefixes: ['claude-'], headerFormat: 'anthropic', baseUrl: 'https://api.anthropic.com/v1' }) as any,
      muyuan: provider({ name: 'muyuan', displayName: 'Muyuan', modelPrefixes: ['claude-'], headerFormat: 'anthropic', baseUrl: 'https://muyuan.example.com/v1' }) as any,
      hundredx: provider({ name: 'hundredx', displayName: '100xLabs', modelPrefixes: ['claude-'], headerFormat: 'anthropic', baseUrl: 'https://100x.example.com/v1' }) as any,
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Wires up fetch to always fail with 502, and key pools so every provider has
   * exactly one usable key. Returns the fetch mock so callers can inspect which
   * upstream hosts were attempted and in what order.
   */
  async function mockAllProvidersFailing() {
    const fetchMock = vi.fn().mockResolvedValue({ status: 502, ok: false, text: async () => 'Error' });
    global.fetch = fetchMock as any;
    const keyPoolMod = await import('../lib/relay/key-pool');
    vi.spyOn(keyPoolMod, 'selectKey').mockResolvedValue({ hash: 'h', key: 'k' } as any);
    vi.spyOn(keyPoolMod, 'getKeyPool').mockResolvedValue({ keys: [{ hash: 'h', key: 'k' }] } as any);
    return fetchMock;
  }

  it('traditional mode: a matching priority rule providerOrder becomes the fallback chain', async () => {
    const fetchMock = await mockAllProvidersFailing();

    const routeEngine = await import('../lib/smart-routing/route-engine');
    vi.spyOn(routeEngine, 'isSmartRoutingConfigured').mockResolvedValue(false);

    // Resolve the request onto the first provider in the rule's order.
    vi.spyOn(resolver, 'resolveProvider').mockResolvedValue(
      provider({ name: 'hundredx', displayName: '100xLabs', modelPrefixes: ['claude-'], headerFormat: 'anthropic', baseUrl: 'https://100x.example.com/v1' }) as any,
    );

    const adminConfig = await import('../lib/admin/admin-config');
    vi.spyOn(adminConfig, 'getPriorityRules').mockResolvedValue([
      { id: 'r', name: 'claude', enabled: true, modelPattern: 'claude-*', providerOrder: ['hundredx', 'muyuan', 'anthropic'], priority: 1 },
    ] as any);
    // Traditional fallback config would be DIFFERENT — prove the rule wins by
    // making this throw if it is ever consulted.
    const staticFallbackSpy = vi.spyOn(adminConfig, 'getFallbackChain');

    try {
      await relayRequest({ model: 'claude-sonnet-4-6', messages: [{ role: 'user', content: 'hi' }] } as any, 'anthropicMessages');
    } catch {
      // expected: all providers fail
    }

    const hosts = fetchMock.mock.calls.map((c) => String(c[0]));
    // Primary 100x, then the rule's remaining order: muyuan, anthropic.
    expect(hosts.some((h) => h.includes('100x.example.com'))).toBe(true);
    expect(hosts.some((h) => h.includes('muyuan.example.com'))).toBe(true);
    expect(hosts.some((h) => h.includes('anthropic.com'))).toBe(true);
    // The static fallback chain must NOT have been used as the source.
    expect(staticFallbackSpy).not.toHaveBeenCalled();
  });

  it('smart routing disabled (enabled=false) falls through to traditional sourcing', async () => {
    await mockAllProvidersFailing();

    // relayRequest gates on isSmartRoutingConfigured (which folds in the enabled
    // flag). When it reports false, smartRoute must never be consulted and the
    // traditional sourcing path runs instead.
    const smartRouting = await import('../lib/smart-routing');
    const isConfiguredSpy = vi.spyOn(smartRouting, 'isSmartRoutingConfigured').mockResolvedValue(false);
    const smartRouteSpy = vi.spyOn(smartRouting, 'smartRoute');

    vi.spyOn(resolver, 'resolveProvider').mockResolvedValue(
      provider({ name: 'anthropic', displayName: 'Anthropic', modelPrefixes: ['claude-'], headerFormat: 'anthropic', baseUrl: 'https://api.anthropic.com/v1' }) as any,
    );
    const adminConfig = await import('../lib/admin/admin-config');
    const prioritySpy = vi.spyOn(adminConfig, 'getPriorityRules').mockResolvedValue([] as any);
    const staticFallbackSpy = vi.spyOn(adminConfig, 'getFallbackChain').mockResolvedValue([]);

    try {
      await relayRequest({ model: 'claude-sonnet-4-6', messages: [{ role: 'user', content: 'hi' }] } as any, 'anthropicMessages');
    } catch {
      // expected
    }

    expect(isConfiguredSpy).toHaveBeenCalled();
    // The defining behavior: smart routing did not take over, and the traditional
    // sourcing path (priority rules → static fallback) ran instead.
    expect(smartRouteSpy).not.toHaveBeenCalled();
    expect(prioritySpy).toHaveBeenCalled();
    expect(staticFallbackSpy).toHaveBeenCalled();
  });
});
