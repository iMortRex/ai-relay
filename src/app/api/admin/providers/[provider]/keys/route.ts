// ============================================================
// AI API Relay — Admin: Provider API Key Management
// GET/POST/DELETE /api/admin/providers/:provider/keys
// ============================================================

import { NextRequest } from 'next/server';
import { requireAdminAuth, getManagedKeys, addManagedKey, removeManagedKey, setManagedKeys, tryDecodeBase64 } from '@/lib/admin';
import { hashKey, updateMemoryKeyPool } from '@/lib/relay';
import { getAllProviders } from '@/lib/providers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = Promise<{ provider: string }>;

/** Mask an API key for safe display: show first 4 and last 4 chars */
function maskKey(key: string): string {
  if (key.length <= 12) return key.slice(0, 4) + '***';
  return key.slice(0, 4) + '***' + key.slice(-4);
}

/**
 * GET /api/admin/providers/:provider/keys
 *
 * Lists API keys for a provider (masked).
 * Returns managed keys from KV if set, otherwise shows env var keys.
 */
export async function GET(request: NextRequest, { params }: { params: Params }) {
  const authErr = requireAdminAuth(request);
  if (authErr) return authErr;

  const { provider } = await params;
  const allProviders = await getAllProviders();
  const config = allProviders[provider];
  if (!config) {
    return Response.json(
      { error: { message: `Unknown provider: ${provider}. Valid: ${Object.keys(allProviders).join(', ')}`, code: 404 } },
      { status: 404 }
    );
  }

  const managedKeys = await getManagedKeys(provider);
  const envKeys = config.envKeyField
    ? (process.env[config.envKeyField] || '').split(',').map((k) => k.trim()).filter(Boolean)
    : [];

  // If managed keys exist, those are authoritative; otherwise use env keys
  const source = managedKeys ? 'managed' : 'env';
  const keys = managedKeys ?? envKeys;

  const keyList = keys.map((key) => ({
    hash: hashKey(key),
    masked: maskKey(key),
    source,
  }));

  return Response.json({
    provider,
    source,
    count: keyList.length,
    keys: keyList,
  }, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    }
  });
}

/**
 * POST /api/admin/providers/:provider/keys
 *
 * Add an API key for a provider.
 * Body: { key: "sk-..." }
 */
export async function POST(request: NextRequest, { params }: { params: Params }) {
  const authErr = requireAdminAuth(request);
  if (authErr) return authErr;

  const { provider } = await params;
  const allProviders = await getAllProviders();
  const config = allProviders[provider];
  if (!config) {
    return Response.json(
      { error: { message: `Unknown provider: ${provider}`, code: 404 } },
      { status: 404 }
    );
  }

  let body: { key?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: { message: 'Invalid JSON body', code: 400 } },
      { status: 400 }
    );
  }

  if (!body.key || typeof body.key !== 'string' || body.key.trim().length === 0) {
    return Response.json(
      { error: { message: 'body.key must be a non-empty string', code: 400 } },
      { status: 400 }
    );
  }

  const newKey = tryDecodeBase64(body.key.trim());
  const envKeys = config.envKeyField
    ? (process.env[config.envKeyField] || '').split(',').map((k) => k.trim()).filter(Boolean)
    : [];

  const result = await addManagedKey(provider, newKey, envKeys);
  updateMemoryKeyPool(provider, result);

  return Response.json({
    provider,
    keyHash: hashKey(newKey),
    masked: maskKey(newKey),
    totalCount: result.length,
    message: result.length === envKeys.length + 1
      ? 'Key added'
      : 'Key already exists',
    added: result.length > (await getManagedKeys(provider))?.length! - 1,
  });
}

/**
 * DELETE /api/admin/providers/:provider/keys
 *
 * Remove an API key from a provider.
 * Body: { key: "full-key-value" } or { hash: "djb2hash" }
 */
export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  const authErr = requireAdminAuth(request);
  if (authErr) return authErr;

  const { provider } = await params;
  const allProviders = await getAllProviders();
  const config = allProviders[provider];
  if (!config) {
    return Response.json(
      { error: { message: `Unknown provider: ${provider}`, code: 404 } },
      { status: 404 }
    );
  }

  let body: { key?: string; hash?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: { message: 'Invalid JSON body', code: 400 } },
      { status: 400 }
    );
  }

  if (!body.key && !body.hash) {
    return Response.json(
      { error: { message: 'Provide either body.key (full value) or body.hash (djb2 hash)', code: 400 } },
      { status: 400 }
    );
  }

  try {
    const envKeys = config.envKeyField
      ? (process.env[config.envKeyField] || '').split(',').map((k) => k.trim()).filter(Boolean)
      : [];

    // If hash is provided, we need to find the actual key first
    if (body.hash && !body.key) {
      const managed = await getManagedKeys(provider);
      const currentKeys = managed ?? envKeys;
      const match = currentKeys.find((k) => hashKey(k) === body.hash);
      if (!match) {
        return Response.json(
          { error: { message: `No key with hash ${body.hash}`, code: 404 } },
          { status: 404 }
        );
      }
      body.key = match;
    }

    const remaining = await removeManagedKey(provider, body.key!, envKeys);
    updateMemoryKeyPool(provider, remaining);

    return Response.json({
      provider,
      removedHash: hashKey(body.key!),
      remainingCount: remaining.length,
      message: 'Key removed',
    });
  } catch (err) {
    return Response.json(
      { error: { message: (err as Error).message, code: 404 } },
      { status: 404 }
    );
  }
}
