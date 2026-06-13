// ============================================================
// AI API Relay — KV Client (shared by smart routing modules)
// ============================================================
// Re-exports the unified getKV from admin-config so smart-routing modules
// automatically inherit CF KV binding, Vercel KV REST API, and dev mock support.

export { getKV } from '../admin/admin-config';
