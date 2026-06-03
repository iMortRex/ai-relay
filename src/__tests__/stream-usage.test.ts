// ============================================================
// Streaming usage parsing helpers — CPU-budget fast path
// ============================================================

import { describe, it, expect } from 'vitest';
import { chunkHasUsage, jsonStringFieldLength } from '@/lib/usage/stream-usage';

describe('stream-usage helpers', () => {
  describe('chunkHasUsage', () => {
    it('returns false for OpenAI content delta chunks (no token fields)', () => {
      const delta = JSON.stringify({
        choices: [{ delta: { content: 'const x = 1;' } }],
        usage: null,
      });
      // include_usage injects "usage": null on every content chunk —
      // the gate must NOT trip on that, only on real *_tokens fields.
      expect(chunkHasUsage(delta)).toBe(false);
    });

    it('returns true for the final OpenAI usage chunk', () => {
      const usageChunk = JSON.stringify({
        choices: [],
        usage: { prompt_tokens: 17, completion_tokens: 42, total_tokens: 59 },
      });
      expect(chunkHasUsage(usageChunk)).toBe(true);
    });

    it('returns false for Anthropic content_block_delta', () => {
      const delta = JSON.stringify({
        type: 'content_block_delta',
        delta: { type: 'text_delta', text: 'function foo() {}' },
      });
      expect(chunkHasUsage(delta)).toBe(false);
    });

    it('returns true for Anthropic message_start and message_delta', () => {
      const start = JSON.stringify({
        type: 'message_start',
        message: { usage: { input_tokens: 10, output_tokens: 1 } },
      });
      const delta = JSON.stringify({
        type: 'message_delta',
        usage: { output_tokens: 99 },
      });
      expect(chunkHasUsage(start)).toBe(true);
      expect(chunkHasUsage(delta)).toBe(true);
    });

    it('returns false for Responses output_text.delta and true on completion', () => {
      const textDelta = JSON.stringify({
        type: 'response.output_text.delta',
        delta: 'class A {}',
      });
      const completed = JSON.stringify({
        type: 'response.completed',
        response: { usage: { input_tokens: 5, output_tokens: 8 } },
      });
      expect(chunkHasUsage(textDelta)).toBe(false);
      expect(chunkHasUsage(completed)).toBe(true);
    });
  });

  describe('jsonStringFieldLength', () => {
    it('measures a plain string field length without JSON.parse', () => {
      const data = JSON.stringify({ choices: [{ delta: { content: 'hello world' } }] });
      expect(jsonStringFieldLength(data, 'content')).toBe('hello world'.length);
    });

    it('matches the parsed length for the Responses delta field', () => {
      const text = 'export const value = 42;';
      const data = JSON.stringify({ type: 'response.output_text.delta', delta: text });
      expect(jsonStringFieldLength(data, 'delta')).toBe(text.length);
    });

    it('returns 0 when the field is absent', () => {
      const data = JSON.stringify({ type: 'ping' });
      expect(jsonStringFieldLength(data, 'content')).toBe(0);
    });

    it('returns 0 when the field is null (not a string)', () => {
      const data = JSON.stringify({ content: null });
      expect(jsonStringFieldLength(data, 'content')).toBe(0);
    });

    it('counts an escaped quote/backslash as a single character and stops at the closing quote', () => {
      // Raw JSON: {"text":"a\"b","other":"x"}
      const raw = '{"text":"a\\"b","other":"x"}';
      // The decoded value is a"b → 3 chars; scanner counts the escape pair as one.
      expect(jsonStringFieldLength(raw, 'text')).toBe(3);
    });

    it('does not bleed past the field into later fields', () => {
      const data = JSON.stringify({ delta: 'short', tail: 'this should not be counted' });
      expect(jsonStringFieldLength(data, 'delta')).toBe('short'.length);
    });
  });
});
