// ============================================================
// AI Relay CLI — Interactive Config Setup
//
// Guides users through initial configuration when no config
// source is found.
// ============================================================

import * as readline from 'readline';
import * as fs from 'fs/promises';
import { getDefaultConfigPath } from '../lib/config-resolver';
import type { FileConfig } from '../lib/config-source';

/**
 * Interactive configuration setup wizard.
 * Prompts the user to choose a setup method and guides them through it.
 */
export async function interactiveConfigSetup(): Promise<void> {
  console.log('\n🎉 Welcome to AI Relay Local!\n');
  console.log('No configuration found. Let\'s set one up.\n');

  const choice = await prompt(
    'How would you like to configure AI Relay?\n' +
    '  1. Login to cloud admin (recommended for team use)\n' +
    '  2. Create local config file (recommended for solo use)\n' +
    '  3. Use environment variables (quick setup)\n' +
    '  4. Skip (configure manually later)\n' +
    'Choose [1-4]: '
  );

  switch (choice.trim()) {
    case '1':
      await setupCloudLogin();
      break;
    case '2':
      await setupLocalConfig();
      break;
    case '3':
      await setupEnvVars();
      break;
    case '4':
      console.log('\nSkipping setup. You can configure later with:');
      console.log('  - ai-relay login <cloud-url>');
      console.log('  - ai-relay local:start --config ./config.json');
      console.log('  - export RELAY_CONFIG_PATH=./config.json\n');
      break;
    default:
      console.log('\n❌ Invalid choice. Exiting.\n');
      process.exit(1);
  }
}

async function setupCloudLogin(): Promise<void> {
  console.log('\n📡 Cloud Login Setup\n');

  const cloudUrl = await prompt('Enter your cloud admin URL (e.g., https://relay.example.com): ');

  if (!cloudUrl.trim()) {
    console.log('\n❌ No URL provided. Exiting.\n');
    process.exit(1);
  }

  console.log('\nRun this command to complete login:');
  console.log(`  ai-relay login ${cloudUrl.trim()}\n`);
}

async function setupLocalConfig(): Promise<void> {
  console.log('\n📄 Local Config File Setup\n');

  const configPath = getDefaultConfigPath();
  console.log(`Creating config at: ${configPath}\n`);

  const config: FileConfig = {
    version: 1,
    providers: {},
    routing: {
      strategy: 'latency',
      fallbackChains: {},
    },
  };

  // Prompt for OpenAI keys
  const openaiKey = await prompt('OpenAI API Key (optional, press Enter to skip): ');
  if (openaiKey.trim()) {
    config.providers!.openai = {
      name: 'OpenAI',
      apiKeys: [openaiKey.trim()],
      baseUrl: 'https://api.openai.com',
    };
  }

  // Prompt for Claude keys
  const claudeKey = await prompt('Anthropic API Key (optional, press Enter to skip): ');
  if (claudeKey.trim()) {
    config.providers!.anthropic = {
      name: 'Anthropic',
      apiKeys: [claudeKey.trim()],
      baseUrl: 'https://api.anthropic.com',
    };
  }

  // Prompt for DeepSeek keys
  const deepseekKey = await prompt('DeepSeek API Key (optional, press Enter to skip): ');
  if (deepseekKey.trim()) {
    config.providers!.deepseek = {
      name: 'DeepSeek',
      apiKeys: [deepseekKey.trim()],
      baseUrl: 'https://api.deepseek.com',
    };
  }

  if (Object.keys(config.providers!).length === 0) {
    console.log('\n⚠️  No providers configured. You can add them later by editing:');
    console.log(`   ${configPath}\n`);
  }

  // Write config file
  try {
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), { mode: 0o600 });
    console.log(`\n✅ Config created: ${configPath}`);
    console.log('\nYou can now start the server with:');
    console.log('  ai-relay local:start\n');
  } catch (err) {
    console.error(`\n❌ Failed to create config: ${(err as Error).message}\n`);
    process.exit(1);
  }
}

async function setupEnvVars(): Promise<void> {
  console.log('\n🔧 Environment Variables Setup\n');

  console.log('Add these to your shell profile (~/.bashrc, ~/.zshrc, etc.):\n');

  const openaiKey = await prompt('OpenAI API Key (optional, press Enter to skip): ');
  if (openaiKey.trim()) {
    console.log(`export OPENAI_KEYS="${openaiKey.trim()}"`);
  }

  const claudeKey = await prompt('Anthropic API Key (optional, press Enter to skip): ');
  if (claudeKey.trim()) {
    console.log(`export CLAUDE_KEYS="${claudeKey.trim()}"`);
  }

  const deepseekKey = await prompt('DeepSeek API Key (optional, press Enter to skip): ');
  if (deepseekKey.trim()) {
    console.log(`export DEEPSEEK_KEYS="${deepseekKey.trim()}"`);
  }

  console.log('\nAfter adding these to your profile:');
  console.log('  source ~/.bashrc  # or ~/.zshrc');
  console.log('  ai-relay local:start\n');
}

/**
 * Prompt user for input and return their response.
 */
function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}
