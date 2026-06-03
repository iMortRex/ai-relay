// ============================================================
// AI API Relay — /v1/messages Route Handler
//
// Anthropic Messages API support for Claude-compatible clients.
// ============================================================

import { NextRequest } from 'next/server';
import { validateAuth, relayRequest } from '@/lib/relay';
import { RelayError } from '@/lib/errors';
import { createUsageEvent, getBatchRecorder } from '@/lib/usage';
import { createUsageStorage } from '@/lib/usage/factory';
import { recordRequestLog } from '@/lib/observability/request-logs';
import { chunkHasUsage, jsonStringFieldLength } from '@/lib/usage/stream-usage';
import type { AnthropicMessagesRequest } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

const batchRecorder = getBatchRecorder();

const CHARS_PER_TOKEN = 4;

function jsonError(status: number, message: string, type = 'invalid_request_error'): Response {
  return new Response(
    JSON.stringify({
      error: {
        type,
        message,
      },
    }),
    { status, headers: { 'Content-Type': 'application/json' } }
  );
}

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / CHARS_PER_TOKEN));
}

function estimateTokensFromChars(charCount: number): number {
  return Math.max(1, Math.ceil(charCount / CHARS_PER_TOKEN));
}

function contentToText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .map((part) => {
      if (!part || typeof part !== 'object') return '';
      const obj = part as Record<string, unknown>;
      if (typeof obj.text === 'string') return obj.text;
      return '';
    })
    .join('');
}

function estimatePromptTokens(body: AnthropicMessagesRequest): number {
  const messageText = body.messages.map((message) => contentToText(message.content)).join('\n');
  const systemText = contentToText(body.system);
  return estimateTokens(`${systemText}\n${messageText}`);
}

function extractOutputText(data: Record<string, unknown>): string {
  if (!Array.isArray(data.content)) return '';
  return data.content
    .map((part) => {
      if (!part || typeof part !== 'object') return '';
      const obj = part as Record<string, unknown>;
      return typeof obj.text === 'string' ? obj.text : '';
    })
    .join('');
}

function wrapAnthropicStreamWithUsageTracking(
  upstreamBody: ReadableStream<Uint8Array>,
  apiKeyHash: string,
  providerName: string,
  model: string,
  startTime: number,
  requestPromptTokens: number,
  traceId: string
): ReadableStream<Uint8Array> {
  const reader = upstreamBody.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let accumulatedContentChars = 0;
  let lastUsage: { input_tokens?: number; output_tokens?: number } | null = null;
  let recorded = false;

  async function recordUsage(promptTokens: number, completionTokens: number): Promise<void> {
    if (recorded) return;
    recorded = true;
    const latencyMs = Date.now() - startTime;
    const event = createUsageEvent({
      provider: providerName,
      model,
      apiKeyHash,
      statusCode: 200,
      promptTokens,
      completionTokens,
      latencyMs,
      isStream: true,
    });
    await batchRecorder.record(event);
    await recordRequestLog({
      traceId,
      timestamp: new Date().toISOString(),
      apiKeyHash,
      model,
      provider: providerName,
      status: 'success',
      httpStatus: 200,
      latencyMs,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      isStream: true,
    });
  }

  return new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        try {
          if (lastUsage) {
            await recordUsage(lastUsage.input_tokens ?? requestPromptTokens, lastUsage.output_tokens ?? 0);
          } else if (accumulatedContentChars > 0) {
            await recordUsage(requestPromptTokens, estimateTokensFromChars(accumulatedContentChars));
          }
        } catch (error) {
          console.error('[Usage] anthropic stream recordUsage failed:', error);
        }
        controller.close();
        return;
      }

      controller.enqueue(value);

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);

        // Fast path: skip JSON.parse for content_block_delta chunks (the bulk
        // of a large generation). Usage lives only in message_start /
        // message_delta, which always carry a *_tokens field.
        if (!chunkHasUsage(data)) {
          if (!lastUsage?.output_tokens) {
            accumulatedContentChars += jsonStringFieldLength(data, 'text');
          }
          continue;
        }

        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'message_start' && parsed.message?.usage) {
            lastUsage = {
              input_tokens: parsed.message.usage.input_tokens,
              output_tokens: parsed.message.usage.output_tokens,
            };
          }
          if (parsed.type === 'message_delta' && parsed.usage) {
            lastUsage = {
              input_tokens: lastUsage?.input_tokens,
              output_tokens: parsed.usage.output_tokens,
            };
          }
        } catch {
          // Ignore non-JSON SSE payloads.
        }
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });
}

function validateBody(body: Partial<AnthropicMessagesRequest>): string | null {
  if (!body.model || typeof body.model !== 'string') {
    return 'Missing required field: model.';
  }
  if (!Number.isFinite(body.max_tokens) || Number(body.max_tokens) <= 0) {
    return 'Missing or invalid required field: max_tokens.';
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return 'Missing or empty required field: messages.';
  }
  return null;
}

export async function POST(request: NextRequest) {
  const traceId = request.headers.get('x-request-id') || `trace_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  if (!(await validateAuth(request))) {
    return jsonError(401, 'Invalid API key. Provide a valid key in the Authorization or x-api-key header.', 'authentication_error');
  }

  const usageStorage = await createUsageStorage();
  batchRecorder.setStorage(usageStorage as any);

  let body: AnthropicMessagesRequest;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'Invalid JSON in request body.');
  }

  const validationError = validateBody(body);
  if (validationError) return jsonError(400, validationError);

  const quota = await usageStorage.checkQuota(true);
  if (!quota.allowed) {
    return new Response(
      JSON.stringify({
        error: {
          type: 'rate_limit_error',
          message: `Rate limit exceeded. Daily: ${quota.dailyUsed}/${quota.dailyLimit}, Monthly: ${quota.monthlyUsed}/${quota.monthlyLimit}. Retry after ${quota.retryAfter}s.`,
        },
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(quota.retryAfter || 60),
        },
      }
    );
  }

  const estimatedPromptTokens = estimatePromptTokens(body);

  try {
    const startTime = Date.now();
    const { response, provider, apiKey } = await relayRequest(body, 'anthropicMessages');
    const latencyMs = Date.now() - startTime;

    if (body.stream && response.ok && response.body) {
      const wrappedBody = wrapAnthropicStreamWithUsageTracking(
        response.body,
        apiKey.hash,
        provider.name,
        body.model,
        startTime,
        estimatedPromptTokens,
        traceId
      );
      return new Response(wrappedBody, {
        status: response.status,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Relay-Provider': provider.name,
          'X-Relay-Key': apiKey.hash,
        },
      });
    }

    const responseBody = await response.text();

    if (response.ok) {
      try {
        const data = JSON.parse(responseBody);
        const promptTokens = data.usage?.input_tokens ?? estimatedPromptTokens;
        const completionTokens = data.usage?.output_tokens ?? estimateTokens(extractOutputText(data));
        const event = createUsageEvent({
          provider: provider.name,
          model: body.model,
          apiKeyHash: apiKey.hash,
          statusCode: response.status,
          promptTokens,
          completionTokens,
          latencyMs,
          isStream: false,
        });
        await batchRecorder.record(event);
        await recordRequestLog({
          traceId,
          timestamp: new Date().toISOString(),
          apiKeyHash: apiKey.hash,
          model: body.model,
          provider: provider.name,
          status: 'success',
          httpStatus: response.status,
          latencyMs,
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
          isStream: false,
        });
      } catch (error) {
        console.error('[Usage] anthropic non-stream track failed:', error);
      }
    }

    return new Response(responseBody, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
        'X-Relay-Provider': provider.name,
        'X-Relay-Key': apiKey.hash,
      },
    });
  } catch (error) {
    if (error instanceof RelayError) {
      return jsonError(error.status, error.message, error.type);
    }

    console.error('Anthropic relay error:', error);
    return jsonError(500, 'Internal relay error.', 'server_error');
  }
}
