// ============================================================
// AI API Relay — Batch Usage Recorder (Ring Buffer + Flush)
// ============================================================
//
// Buffers usage events in memory, then flushes to KV in batches.
// This reduces KV commands per request from ~15 to ~1-2.
//
// Strategy:
// - Each record() adds to an in-memory ring buffer (aggregated by key)
// - Flush triggers: buffer reaches MAX_BATCH_SIZE or FLUSH_INTERVAL_MS
// - Graceful: try to flush remaining on process exit (best-effort)
// - Risk: un-flushed data lost on cold restart (max ~60s of data)

import type { KVUsageStorage } from './kv-storage';
import { getUsageSamplingInfo, shouldSample } from './kv-storage';
import type { UsageEvent } from '../sdk';

const MAX_BATCH_SIZE = 100;
const FLUSH_INTERVAL_MS = 60_000;

interface PendingEntry {
  requests: number;
  tokens: number;
  promptTokens: number;
  completionTokens: number;
}

export class BatchUsageRecorder {
  private pending = new Map<string, PendingEntry>();
  private errorPending = new Map<string, { count: number; reason: string }>();
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private storage: KVUsageStorage | null = null;
  private totalPending = 0;
  private destroyed = false;
  private flushing = false;

  /**
   * Attach the storage backend. Must be called before record().
   */
  setStorage(storage: KVUsageStorage): void {
    this.storage = storage;
  }

  /**
   * Buffer a usage event. Aggregates by key for efficient batch writes.
   */
  record(event: UsageEvent): void {
    if (this.destroyed) return;

    const usageSampleRate = getUsageSamplingInfo().sampleRate;
    if (!shouldSample(usageSampleRate)) return;
    const usageScale = usageSampleRate > 0 && usageSampleRate < 1
      ? Math.max(1, Math.round(1 / usageSampleRate))
      : 1;
    const scaledEvent: UsageEvent = {
      ...event,
      promptTokens: event.promptTokens * usageScale,
      completionTokens: event.completionTokens * usageScale,
      totalTokens: event.totalTokens * usageScale,
    };

    const keys = this.getKeysForEvent(scaledEvent);
    for (const key of keys) {
      const existing = this.pending.get(key);
      if (existing) {
        existing.requests += usageScale;
        existing.tokens += scaledEvent.totalTokens;
        existing.promptTokens += scaledEvent.promptTokens;
        existing.completionTokens += scaledEvent.completionTokens;
      } else {
        this.pending.set(key, {
          requests: usageScale,
          tokens: scaledEvent.totalTokens,
          promptTokens: scaledEvent.promptTokens,
          completionTokens: scaledEvent.completionTokens,
        });
      }
    }

    this.totalPending++;
    this.ensureTimer();

    if (this.totalPending >= MAX_BATCH_SIZE) {
      this.flush();
    }
  }

  /**
   * Buffer an error event.
   */
  recordError(event: {
    provider: string;
    keyHash: string;
    statusCode: number;
    reason: string;
  }): void {
    if (this.destroyed) return;

    const key = `error:${event.provider}:${event.statusCode}`;
    const existing = this.errorPending.get(key);
    if (existing) {
      existing.count++;
      existing.reason = event.reason.slice(0, 200);
    } else {
      this.errorPending.set(key, {
        count: 1,
        reason: event.reason.slice(0, 200),
      });
    }
  }

  /**
   * Flush all pending data to KV storage.
   * Called on timer, on batch full, or on graceful shutdown.
   */
  async flush(): Promise<void> {
    if (this.flushing) return;
    if (this.pending.size === 0 && this.errorPending.size === 0) return;
    if (!this.storage) return;

    this.flushing = true;
    try {

    // Swap out pending data atomically
    const usageEntries = new Map(this.pending);
    const errorEntries = new Map(this.errorPending);
    this.pending.clear();
    this.errorPending.clear();
    this.totalPending = 0;

    // Flush usage data via direct KV writes
    const usagePromises: Promise<void>[] = [];
    for (const [key, entry] of usageEntries) {
      const parts = key.split(':');
      if (parts[0] === 'global') {
        usagePromises.push(
          this.storage.recordDirect({
            requestId: `batch_${Date.now()}_${key}`,
            provider: '',
            model: '',
            apiKeyHash: '',
            statusCode: 200,
            promptTokens: entry.promptTokens,
            completionTokens: entry.completionTokens,
            totalTokens: entry.tokens,
            latencyMs: 0,
            isStream: false,
          }, entry.requests)
        );
      } else if (parts[0] === 'provider' && parts[1]) {
        usagePromises.push(
          this.storage.recordDirect({
            requestId: `batch_${Date.now()}_${key}`,
            provider: parts[1],
            model: '',
            apiKeyHash: '',
            statusCode: 200,
            promptTokens: entry.promptTokens,
            completionTokens: entry.completionTokens,
            totalTokens: entry.tokens,
            latencyMs: 0,
            isStream: false,
          }, entry.requests, { includeGlobal: false })
        );
      }
    }

    // Flush error data
    const errorPromises: Promise<void>[] = [];
    for (const [key, entry] of errorEntries) {
      const parts = key.split(':');
      if (parts.length >= 3) {
        errorPromises.push(
          this.storage.recordErrorDirect({
            provider: parts[1],
            keyHash: 'batch',
            statusCode: Number(parts[2]),
            reason: entry.reason,
            count: entry.count,
          })
        );
      }
    }

      await Promise.allSettled([...usagePromises, ...errorPromises]);
    } finally {
      this.flushing = false;
    }
  }

  /**
   * Destroy the recorder and flush remaining data.
   */
  async destroy(): Promise<void> {
    this.destroyed = true;
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
  }

  /**
   * Number of pending entries (for monitoring).
   */
  get pendingCount(): number {
    return this.totalPending;
  }

  private ensureTimer(): void {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => {
      this.flush().catch(() => {});
    }, FLUSH_INTERVAL_MS);
    // Don't hold the process open just for the timer
    if (this.flushTimer && typeof this.flushTimer.unref === 'function') {
      this.flushTimer.unref();
    }
  }

  private getKeysForEvent(event: UsageEvent): string[] {
    const keys: string[] = ['global'];
    if (event.provider) {
      keys.push(`provider:${event.provider}`);
    }
    return keys;
  }
}

// Module-level singleton — persists across warm invocations in serverless
let _batchRecorder: BatchUsageRecorder | null = null;

/**
 * Get or create the singleton batch recorder.
 * In serverless, this persists across warm invocations (module scope).
 */
export function getBatchRecorder(): BatchUsageRecorder {
  if (!_batchRecorder) {
    _batchRecorder = new BatchUsageRecorder();

    // Best-effort graceful shutdown (works in long-running processes)
    if (typeof process !== 'undefined') {
      const shutdown = () => {
        _batchRecorder?.flush().catch(() => {});
      };
      process.on('SIGTERM', shutdown);
      process.on('SIGINT', shutdown);
      process.on('beforeExit', shutdown);
    }
  }
  return _batchRecorder;
}

/**
 * For testing only.
 */
export function __resetBatchRecorder(): void {
  if (_batchRecorder) {
    _batchRecorder.destroy().catch(() => {});
    _batchRecorder = null;
  }
}
