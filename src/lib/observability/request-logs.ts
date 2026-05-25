// ============================================================
// AI Relay v2.1 — Request Logs (memory-only)
// ============================================================
//
// Lightweight in-memory request log for debugging.
// No KV storage — logs live only in the serverless instance memory.
// Configure via env vars:
//   ENABLE_REQUEST_LOGS=true    to enable (default: disabled)
//   REQUEST_LOGS_MAX_ENTRIES=50 max entries to keep in memory (default: 50)

export type RequestLogStatus = 'success' | 'error';

export interface RequestLogEntry {
  traceId: string;
  timestamp: string;
  apiKeyHash?: string;
  model?: string;
  provider?: string;
  status: RequestLogStatus;
  httpStatus: number;
  latencyMs: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  isStream?: boolean;
  errorType?: string;
  errorMessage?: string;
  diagnostic?: string;
}

export interface RequestLogFilters {
  provider?: string;
  status?: RequestLogStatus | 'all';
  traceId?: string;
  limit?: number;
}

export interface RequestLogListResult {
  items: RequestLogEntry[];
  degraded: boolean;
  source: 'memory';
}

// ── Configuration ────────────────────────────────────────────
function isRequestLogsEnabled(): boolean {
  return process.env.ENABLE_REQUEST_LOGS === 'true';
}

function getMaxEntries(): number {
  const raw = process.env.REQUEST_LOGS_MAX_ENTRIES;
  if (!raw) return 50;
  const n = parseInt(raw, 10);
  return isNaN(n) || n < 1 ? 50 : Math.min(n, 500); // hard cap at 500
}

const DEFAULT_LIMIT = 50;
const requestLogStore: RequestLogEntry[] = [];

// ── Helpers ──────────────────────────────────────────────────

export function sanitizeDiagnosticText(input?: string): string | undefined {
  if (!input) return input;
  return input
    .replace(/Bearer\s+[^\s,;]+/gi, 'Bearer [REDACTED]')
    .replace(/sk-[A-Za-z0-9._-]{6,}/g, '[REDACTED]')
    .replace(/(api[_-]?key|token|secret|password)=([^&]+)/gi, '$1=[REDACTED]')
    .replace(/\*{3,}/g, '[REDACTED]')
    .slice(0, 1200);
}

function sanitizeEntry(entry: RequestLogEntry): RequestLogEntry {
  return {
    ...entry,
    apiKeyHash: entry.apiKeyHash ? entry.apiKeyHash.slice(0, 12) : undefined,
    errorMessage: sanitizeDiagnosticText(entry.errorMessage),
    diagnostic: sanitizeDiagnosticText(entry.diagnostic),
  };
}

function applyFilters(items: RequestLogEntry[], filters: RequestLogFilters = {}): RequestLogEntry[] {
  const limit = Math.min(Math.max(filters.limit || DEFAULT_LIMIT, 1), 200);
  return items
    .filter((item) => !filters.status || filters.status === 'all' || item.status === filters.status)
    .filter((item) => !filters.provider || item.provider === filters.provider)
    .filter((item) => !filters.traceId || item.traceId.includes(filters.traceId))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit);
}

function remember(entry: RequestLogEntry): void {
  requestLogStore.unshift(entry);
  const max = getMaxEntries();
  if (requestLogStore.length > max) requestLogStore.length = max;
}

// ── Public API ───────────────────────────────────────────────

/**
 * Record a request log entry (memory only, no KV).
 */
export async function recordRequestLog(input: RequestLogEntry): Promise<void> {
  if (!isRequestLogsEnabled()) return;
  remember(sanitizeEntry(input));
}

/**
 * List request logs from memory.
 */
export async function listRequestLogs(filters: RequestLogFilters = {}): Promise<RequestLogListResult> {
  if (!isRequestLogsEnabled()) {
    return { items: [], degraded: false, source: 'memory' };
  }
  return { items: applyFilters(requestLogStore, filters), degraded: false, source: 'memory' };
}

// ── Test helpers ─────────────────────────────────────────────

export const __requestLogStoreForTests = {
  clear(): void {
    requestLogStore.length = 0;
  },
  items(): RequestLogEntry[] {
    return [...requestLogStore];
  },
};
