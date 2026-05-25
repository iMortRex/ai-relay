import { describe, expect, it, vi, beforeEach } from 'vitest';
import { __requestLogStoreForTests, listRequestLogs, recordRequestLog, sanitizeDiagnosticText } from '../lib/observability/request-logs';

describe('request log observability', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    __requestLogStoreForTests.clear();
  });

  it('sanitizes bearer tokens and sk-style secrets from diagnostics', () => {
    const input = 'Authorization: Bearer *** failed with api_key=sk-ano...cdef';
    const output = sanitizeDiagnosticText(input);

    expect(output).not.toContain('sk-liv...oken');
    expect(output).not.toContain('***');
    expect(output).toContain('[REDACTED]');
  });

  it('records and filters request logs in memory', async () => {
    vi.stubEnv('ENABLE_REQUEST_LOGS', 'true');

    await recordRequestLog({
      traceId: 'trace_success',
      timestamp: '2026-05-25T00:00:00.000Z',
      apiKeyHash: 'abcd1234',
      model: 'gpt-4o-mini',
      provider: 'openai',
      status: 'success',
      httpStatus: 200,
      latencyMs: 321,
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
      isStream: false,
    });
    await recordRequestLog({
      traceId: 'trace_error',
      timestamp: '2026-05-25T00:01:00.000Z',
      apiKeyHash: 'efgh5678',
      model: 'claude-3-5-sonnet',
      provider: 'anthropic',
      status: 'error',
      httpStatus: 401,
      latencyMs: 99,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      isStream: false,
      errorType: 'authentication_error',
      errorMessage: 'Bearer *** was rejected',
    });

    const all = await listRequestLogs();
    expect(all.source).toBe('memory');
    expect(all.degraded).toBe(false);
    expect(all.items).toHaveLength(2);

    const errors = await listRequestLogs({ status: 'error' });
    expect(errors.items).toHaveLength(1);
    expect(errors.items[0].traceId).toBe('trace_error');
    expect(errors.items[0].errorMessage).not.toContain('***');
  });

  it('returns empty when disabled', async () => {
    // ENABLE_REQUEST_LOGS not set — should be disabled
    const result = await listRequestLogs();
    expect(result.items).toHaveLength(0);
    expect(result.source).toBe('memory');
  });

  it('respects max entries limit', async () => {
    vi.stubEnv('ENABLE_REQUEST_LOGS', 'true');
    vi.stubEnv('REQUEST_LOGS_MAX_ENTRIES', '3');

    for (let i = 0; i < 5; i++) {
      await recordRequestLog({
        traceId: `trace_${i}`,
        timestamp: `2026-05-25T00:0${i}:00.000Z`,
        status: 'success',
        httpStatus: 200,
        latencyMs: 100,
      });
    }

    const result = await listRequestLogs({ limit: 100 });
    expect(result.items).toHaveLength(3);
    // Should keep the most recent 3
    expect(result.items[0].traceId).toBe('trace_4');
    expect(result.items[1].traceId).toBe('trace_3');
    expect(result.items[2].traceId).toBe('trace_2');
  });
});
