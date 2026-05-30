// ============================================================
// Cloudflare Pages Scheduled Handler
//
// CF Cron Triggers don't invoke HTTP routes — they call this
// scheduled() handler directly. We forward to the appropriate
// cron logic based on the schedule.
// ============================================================

/// <reference types="@cloudflare/workers-types" />

interface Env {
  KV: KVNamespace;
  DB: D1Database;
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
}

export default {
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    const cron = event.cron;

    // Map cron schedules to their handlers
    // "0 0 * * *" → daily reset at midnight UTC
    // "5 0 * * *" → daily probe at 00:05 UTC
    if (cron === '0 0 * * *') {
      ctx.waitUntil(handleDailyReset(env));
    } else if (cron === '5 0 * * *') {
      ctx.waitUntil(handleDailyProbe(env));
    } else {
      console.warn(`[Cron] Unknown schedule: ${cron}`);
    }
  },
};

/**
 * Daily reset: clear quota counters for the previous day.
 */
async function handleDailyReset(env: Env): Promise<void> {
  try {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const periodKey = `daily:${yesterday}`;

    // Delete old daily counter from D1
    await env.DB.prepare('DELETE FROM quota_counters WHERE period = ?')
      .bind(periodKey)
      .run();

    console.log(`[Cron] Daily reset completed: deleted ${periodKey}`);
  } catch (error) {
    console.error('[Cron] Daily reset failed:', error);
    throw error;
  }
}

/**
 * Daily probe: health check to verify cron is working.
 */
async function handleDailyProbe(env: Env): Promise<void> {
  try {
    const timestamp = new Date().toISOString();

    // Write probe timestamp to KV
    await env.KV.put('cron:last_probe', timestamp, {
      expirationTtl: 86400 * 7, // 7 days
    });

    console.log(`[Cron] Daily probe completed at ${timestamp}`);
  } catch (error) {
    console.error('[Cron] Daily probe failed:', error);
    throw error;
  }
}
