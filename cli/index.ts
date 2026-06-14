#!/usr/bin/env node

// ============================================================
// AI Relay CLI — Entry Point
// ============================================================

import { Command } from 'commander';
import * as os from 'os';

const program = new Command();

program
  .name('ai-relay')
  .version('2.13.0')
  .description('AI Relay Local Runtime CLI');

program
  .command('login [cloud-url]')
  .description('Bind this device to a cloud admin instance (optional)')
  .action(async (cloudUrl?: string) => {
    if (!cloudUrl) {
      console.log('Cloud login is optional. You can also:');
      console.log('  - Use local config: ai-relay local:start --config ./config.json');
      console.log('  - Set environment: export RELAY_CONFIG_PATH=./config.json');
      console.log('  - Use inline keys: export OPENAI_KEYS=sk-xxx');
      console.log('\nFor cloud login, provide the URL:');
      console.log('  ai-relay login <cloud-url>');
      return;
    }

    const { login } = await import('./local/login.js');
    await login(cloudUrl, { device_name: os.hostname(), platform: os.platform() });
  });

program
  .command('local')
  .description('Manage local relay server')
  .action(() => {
    program.help();
  });

program
  .command('local:start')
  .description('Start local relay server')
  .option('-c, --config <source>', 'Config source (URL or file path)')
  .option('-p, --port <port>', 'Listen port (default: 3147)')
  .option('--host <host>', 'Listen host (default: 127.0.0.1)')
  .action(async (options: { config?: string; port?: string; host?: string }) => {
    const { startCommand } = await import('./local/commands.js');
    await startCommand(options);
  });

program
  .command('local:status')
  .description('Show local relay status and configuration')
  .action(async () => {
    const { statusCommand } = await import('./local/commands.js');
    await statusCommand();
  });

program
  .command('agent:install <agent>')
  .description('Install agent adapter (codex)')
  .option('--dry-run', 'Show what would be changed')
  .action(async (agent: string, options: { dryRun?: boolean }) => {
    const { CodexAdapter } = await import('./agent/codex-adapter.js');
    const { loadProfile } = await import('./local/profile.js');

    const profile = await loadProfile();
    if (!profile) {
      console.error('❌ Not logged in. Run "ai-relay login" first.');
      process.exit(1);
    }

    const adapter = new CodexAdapter();
    const localRelayUrl = `http://${profile.listenHost}:${profile.listenPort}`;

    const result = await adapter.install({ localRelayUrl, dryRun: options.dryRun || false });

    if (result.success) {
      console.log(result.message);
    } else {
      console.error(`❌ ${result.message}`);
      process.exit(1);
    }
  });

program
  .command('agent:doctor <agent>')
  .description('Check agent configuration')
  .action(async (agent: string) => {
    const { CodexAdapter } = await import('./agent/codex-adapter.js');

    const adapter = new CodexAdapter();
    const result = await adapter.doctor();

    console.log(`\n🔍 Checking ${adapter.label} configuration:\n`);

    for (const check of result.checks) {
      const icon = check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌';
      console.log(`${icon} ${check.name}`);
      console.log(`   ${check.message}\n`);
    }

    if (result.ok) {
      console.log('✅ All checks passed!\n');
    } else {
      console.log('⚠️  Some checks failed\n');
      process.exit(1);
    }
  });

program
  .command('agent:uninstall <agent>')
  .description('Uninstall agent adapter')
  .action(async (agent: string) => {
    const { CodexAdapter } = await import('./agent/codex-adapter.js');

    const adapter = new CodexAdapter();
    await adapter.uninstall();
    console.log(`✅ Uninstalled ${adapter.label} adapter`);
  });

program.parse();
