// ============================================================
// AI API Relay — Core Relay Logic (with 429 protection)
// ============================================================

import type { ChatCompletionRequest } from '../types';
import type { RelayResult } from '../providers/types';
import { resolveProvider, getUpstreamUrl, resolveModelAlias } from '../providers';
import { selectKey, markCooldown, getKeyPool } from './key-pool';
import { buildHeaders, transformToAnthropic } from './transform';
import { RelayError } from '../errors';
import { createUsageEvent } from '../usage/sdk';
import { KVUsageStorage } from '../usage/storage/kv-storage';
import {
  checkRateLimit,
  record429,
  recordSuccess,
  backoffSleep,
} from './rate-limiter';

const usageStorage = new KVUsageStorage();

/**
 * Core relay function — forwards a chat completion request to the upstream provider.
 * Supports both streaming and non-streaming.
 *
 * 429 protection layers:
 * 1. Token bucket — proactive rate limiting before the request
 * 2. Circuit breaker — stops requests after consecutive 429s
 * 3. Exponential backoff — reactive delay between retries
 * 4. Key rotation — switch to next available key on 429/5xx
 */
export async function relayRequest(
  body: ChatCompletionRequest
): Promise<RelayResult> {
  const provider = resolveProvider(body.model);
  if (!provider) {
    throw new RelayError(
      `Unknown model: ${body.model}. Supported prefixes: gpt-, claude-, deepseek-, mimo-`,
      'invalid_request_error',
      400
    );
  }

  // Resolve model alias
  const resolvedModel = resolveModelAlias(body.model);

  // Pre-flight: check rate limiter (token bucket + circuit breaker)
  const rateLimitCheck = checkRateLimit(provider.name);
  if (!rateLimitCheck.allowed) {
    throw new RelayError(
      rateLimitCheck.reason || 'Rate limit exceeded',
      'rate_limit_error',
      429
    );
  }

  // Select an API key
  const apiKey = selectKey(provider);
  if (!apiKey) {
    throw new RelayError(
      `No API keys configured for provider: ${provider.displayName}`,
      'server_error',
      503
    );
  }

  const url = getUpstreamUrl(provider);
  const isAnthropic = provider.headerFormat === 'anthropic';

  // Transform request body if needed (use resolved model name)
  const bodyWithResolvedModel = { ...body, model: resolvedModel };
  const requestBody = isAnthropic ? transformToAnthropic(bodyWithResolvedModel) : bodyWithResolvedModel;

  // Retry with key rotation + exponential backoff
  const pool = getKeyPool(provider);
  const maxRetries = Math.min(pool.keys.length, 3);
  let lastError: Error | null = null;
  let currentKey = apiKey;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Exponential backoff between retries (skip on first attempt)
    if (attempt > 0) {
      await backoffSleep(attempt - 1);
    }

    // Re-check circuit breaker before each attempt
    const retryCheck = checkRateLimit(provider.name);
    if (!retryCheck.allowed) {
      throw new RelayError(
        retryCheck.reason || 'Rate limit exceeded',
        'rate_limit_error',
        429
      );
    }

    const startTime = Date.now();
    try {
      const upstreamResponse = await fetch(url, {
        method: 'POST',
        headers: buildHeaders(provider.headerFormat, currentKey.key, !!body.stream),
        body: JSON.stringify(requestBody),
      });

      const latencyMs = Date.now() - startTime;

      // 429 → record in rate limiter + try next key
      if (upstreamResponse.status === 429) {
        record429(provider.name);
        markCooldown(currentKey);
        const nextKey = selectKey(provider);
        if (nextKey && nextKey.hash !== currentKey.hash) {
          currentKey = nextKey;
          continue;
        }
        return { response: upstreamResponse, provider, apiKey: currentKey };
      }

      // 401/403 → key invalid/expired, rotate to next key
      if (upstreamResponse.status === 401 || upstreamResponse.status === 403) {
        markCooldown(currentKey);
        const nextKey = selectKey(provider);
        if (nextKey && nextKey.hash !== currentKey.hash) {
          currentKey = nextKey;
          continue;
        }
        return { response: upstreamResponse, provider, apiKey: currentKey };
      }

      // 5xx → try next key (but don't count as 429 for circuit breaker)
      if (upstreamResponse.status >= 500) {
        markCooldown(currentKey);
        const nextKey = selectKey(provider);
        if (nextKey && nextKey.hash !== currentKey.hash) {
          currentKey = nextKey;
          continue;
        }
        return { response: upstreamResponse, provider, apiKey: currentKey };
      }

      // Success → record in rate limiter
      recordSuccess(provider.name);

      // Track usage asynchronously (non-streaming only)
      if (!body.stream && upstreamResponse.ok) {
        trackUsageAsync(currentKey, upstreamResponse.clone(), provider.name, body.model, latencyMs);
      }

      return { response: upstreamResponse, provider, apiKey: currentKey };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      markCooldown(currentKey);
      const nextKey = selectKey(provider);
      if (nextKey && nextKey.hash !== currentKey.hash) {
        currentKey = nextKey;
        continue;
      }
    }
  }

  throw new RelayError(
    `All retry attempts failed for ${provider.displayName}: ${lastError?.message}`,
    'server_error',
    502
  );
}

/**
 * Track usage from a non-streaming response (async, fire-and-forget).
 * Uses the 10-field UsageEvent schema.
 */
function trackUsageAsync(
  apiKey: { hash: string },
  response: Response,
  providerName: string,
  model: string,
  latencyMs: number
): void {
  response
    .clone()
    .json()
    .then((data) => {
      const usage = data?.usage;
      if (usage) {
        const event = createUsageEvent({
          provider: providerName,
          model,
          apiKeyHash: apiKey.hash,
          statusCode: 200,
          promptTokens: usage.prompt_tokens || 0,
          completionTokens: usage.completion_tokens || 0,
          latencyMs,
          isStream: false,
        });
        usageStorage.record(event).catch(() => {});
      }
    })
    .catch(() => {});
}
