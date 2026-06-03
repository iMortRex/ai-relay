// ============================================================
// AI API Relay — Streaming Usage Parsing Helpers
// ============================================================
//
// Streaming responses for large (e.g. code) generations emit thousands
// of SSE delta chunks. Running JSON.parse on every chunk just to look
// for token usage is what pushes the worker past Cloudflare's CPU-time
// budget. Usage data lives in only a couple of chunks per stream, and
// every one of those carries a *_tokens field (prompt_tokens /
// completion_tokens / input_tokens / output_tokens). A cheap substring
// check lets us skip JSON.parse for the content deltas entirely.

/** True only for chunks that could carry token-usage data. */
export function chunkHasUsage(data: string): boolean {
  return data.indexOf('_tokens') !== -1;
}

/**
 * Measure the character length of a JSON string field value without running
 * JSON.parse. Used only for fallback token estimation when an upstream omits
 * usage data from its stream. Approximate by design — escape sequences are
 * counted as written rather than decoded, which is well within the tolerance
 * of the chars-per-token heuristic.
 *
 * Returns 0 when the field is absent or not a string (e.g. "content":null).
 */
export function jsonStringFieldLength(data: string, key: string): number {
  const marker = `"${key}":"`;
  const start = data.indexOf(marker);
  if (start === -1) return 0;
  let len = 0;
  for (let i = start + marker.length; i < data.length; i++) {
    const c = data.charCodeAt(i);
    if (c === 92) {
      // Backslash escape — skip the next char, count the pair as one.
      i++;
      len++;
      continue;
    }
    if (c === 34) break; // unescaped closing quote
    len++;
  }
  return len;
}
