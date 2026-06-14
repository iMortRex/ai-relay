// ============================================================
// AI Relay CLI — Local Profile Management
// ============================================================

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface LocalProfile {
  cloudUrl?: string;
  deviceId?: string;
  deviceToken?: string;
  deviceName: string;
  listenHost: string;
  listenPort: number;
  configVersion: number;
  lastSyncAt?: string;
}

export function getProfileDir(): string {
  return path.join(os.homedir(), '.ai-relay');
}

export function getProfilePath(): string {
  return path.join(getProfileDir(), 'config.json');
}

export function getDbPath(): string {
  return path.join(getProfileDir(), 'local.db');
}

export async function loadProfile(): Promise<LocalProfile | null> {
  const profilePath = getProfilePath();
  if (!fs.existsSync(profilePath)) {
    return null;
  }
  const data = fs.readFileSync(profilePath, 'utf-8');
  return JSON.parse(data);
}

export async function saveProfile(profile: LocalProfile): Promise<void> {
  const profileDir = getProfileDir();
  if (!fs.existsSync(profileDir)) {
    fs.mkdirSync(profileDir, { recursive: true });
  }
  const profilePath = getProfilePath();
  fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2), { mode: 0o600 });
}

export function ensureDirectories(): void {
  const profileDir = getProfileDir();
  const logsDir = path.join(profileDir, 'logs');
  const backupsDir = path.join(profileDir, 'backups');
  const agentsDir = path.join(profileDir, 'agents');

  for (const dir of [profileDir, logsDir, backupsDir, agentsDir]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

/**
 * Validate that a profile has consistent cloud-related fields.
 * cloudUrl, deviceId, deviceToken must be all present or all absent.
 */
export function validateProfile(profile: LocalProfile): boolean {
  const hasCloudUrl = !!profile.cloudUrl;
  const hasDeviceId = !!profile.deviceId;
  const hasDeviceToken = !!profile.deviceToken;

  // All cloud fields must be present together or absent together
  return (
    (hasCloudUrl && hasDeviceId && hasDeviceToken) ||
    (!hasCloudUrl && !hasDeviceId && !hasDeviceToken)
  );
}

/**
 * Create a default profile with no cloud connection.
 * Suitable for standalone mode with file-based config.
 */
export function createDefaultProfile(): LocalProfile {
  return {
    deviceName: os.hostname(),
    listenHost: '127.0.0.1',
    listenPort: 3147,
    configVersion: 0,
  };
}

/**
 * Load profile or create a default one if it doesn't exist.
 */
export async function loadOrCreateProfile(): Promise<LocalProfile> {
  const existing = await loadProfile();
  if (existing) {
    return existing;
  }

  // Create default profile for standalone mode
  const defaultProfile = createDefaultProfile();
  ensureDirectories();
  await saveProfile(defaultProfile);
  return defaultProfile;
}
