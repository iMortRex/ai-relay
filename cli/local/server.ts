// ============================================================
// AI Relay CLI — Local HTTP Server
// ============================================================

import * as http from 'http';
import type { LocalProfile } from './profile';
import type { ConfigSource } from '../lib/config-source';
import type { ConfigSnapshot } from '../../src/lib/config-store/types';
import { resolveConfigSource } from '../lib/config-resolver';

export interface LocalServer {
  port: number;
  stop(): Promise<void>;
}

export interface StartServerOptions {
  profile: LocalProfile;
  configArg?: string;
  configSource?: ConfigSource;
}

export async function startLocalServer(options: StartServerOptions): Promise<LocalServer> {
  const { profile, configArg, configSource: explicitSource } = options;

  // Resolve config source
  const configSource = explicitSource || resolveConfigSource({
    configArg,
    profile,
    env: process.env,
  });

  if (!configSource) {
    throw new Error(
      'No configuration source found. Please:\n' +
      '  - Login: ai-relay login <cloud-url>\n' +
      '  - Use config file: ai-relay local:start --config ./config.json\n' +
      '  - Set environment: export RELAY_CONFIG_PATH=./config.json'
    );
  }

  console.log(`📋 Config source: ${configSource.describe()}`);

  let config: ConfigSnapshot | null = null;
  let configVersion = 0;

  // Load initial config
  try {
    config = await configSource.load();
    configVersion = config.version;
    console.log(`✅ Config loaded (v${configVersion})`);
  } catch (err) {
    console.error('❌ Failed to load initial config:', (err as Error).message);
    throw err;
  }

  // Setup config watching/syncing if supported
  let configSyncInterval: NodeJS.Timeout | undefined;
  if (configSource.watch) {
    configSource.watch(async () => {
      try {
        const updated = await configSource.load();
        if (updated.version > configVersion) {
          config = updated;
          configVersion = updated.version;
          console.log(`✅ Config synced (v${configVersion})`);
        }
      } catch (err) {
        console.error('❌ Config sync failed:', (err as Error).message);
      }
    });
  }

  // Heartbeat loop (only if connected to cloud)
  let heartbeatInterval: NodeJS.Timeout | undefined;
  if (profile.cloudUrl && profile.deviceToken) {
    heartbeatInterval = setInterval(async () => {
      try {
        await fetch(`${profile.cloudUrl}/api/local/usage/batch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${profile.deviceToken}`,
          },
          body: JSON.stringify({ events: [] }),
        });
      } catch (err) {
        console.error('❌ Heartbeat failed:', (err as Error).message);
      }
    }, 60_000);
  }

  // HTTP server

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);

    if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', version: '2.13.0', config_version: configVersion }));
      return;
    }

    if (url.pathname === '/v1/models') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ object: 'list', data: [] }));
      return;
    }

    if (url.pathname === '/v1/chat/completions' || url.pathname === '/v1/messages') {
      // Relay to upstream (simplified - full implementation needs relayRequest)
      res.writeHead(501, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Relay logic not yet wired' }));
      return;
    }

    res.writeHead(404);
    res.end('Not Found');
  });

  return new Promise((resolve) => {
    server.listen(profile.listenPort, profile.listenHost, () => {
      resolve({
        port: profile.listenPort,
        async stop() {
          // Clear intervals
          if (configSyncInterval) clearInterval(configSyncInterval);
          if (heartbeatInterval) clearInterval(heartbeatInterval);

          // Dispose config source if it supports disposal
          if ('dispose' in configSource && typeof configSource.dispose === 'function') {
            (configSource as any).dispose();
          }

          // Close HTTP server
          return new Promise((resolve) => server.close(() => resolve()));
        },
      });
    });
  });
}
