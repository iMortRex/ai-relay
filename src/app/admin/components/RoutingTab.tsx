'use client';

import { useState, useEffect, useCallback } from 'react';

// ============================================================
// Types (mirror smart-routing/types.ts for client-side)
// ============================================================

type RoutingStrategy = 'latency' | 'cost' | 'availability';
type ProviderHealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown';

interface ProviderHealthInfo {
  provider: string;
  displayName: string;
  status: ProviderHealthStatus;
  avgLatencyMs: number;
  successRate: number;
  consecutiveFailures: number;
  lastFailureAt: number;
  lastSuccessAt: number;
  availableKeys: number;
  totalKeys: number;
}

interface RoutingConfig {
  enabled: boolean;
  strategy: RoutingStrategy;
  costWeights: Array<{ provider: string; costPerMillionTokens: number; weight: number }>;
  maxLatencyMs: number;
  failureThreshold: number;
  recoverySeconds: number;
  stickySession: boolean;
  providerTimeoutMs: Record<string, number>;
  maxRetries: number;
  preferredProviderTolerancePercent: number;
  updatedAt: number;
}

interface RoutingStatus {
  strategy: RoutingStrategy;
  activeProviders: ProviderHealthInfo[];
  recentSwitches: Array<{
    from: string;
    to: string;
    reason: string;
    timestamp: number;
  }>;
  totalRequests: number;
  routingSince: number;
}

interface RoutingData {
  config: RoutingConfig;
  status: RoutingStatus;
}

interface RoutingTabProps {
  apiKey: string;
  lang: 'zh' | 'en';
}

// ============================================================
// Translations
// ============================================================

const T = {
  zh: {
    loading: '加载中...',
    retry: '重试',
    noData: '暂无路由数据',

    // Strategy
    strategy: '路由策略',
    latency: '延迟优先',
    latencyDesc: '选择延迟最低的 Provider',
    cost: '成本优先',
    costDesc: '优先使用低成本 Provider',
    availability: '可用性优先',
    availabilityDesc: '优先保证服务可用',
    currentStrategy: '当前策略',
    strategySwitched: '策略已切换',

    // Topology
    topology: '路由拓扑',
    latency_label: '延迟',
    successRate: '成功率',
    failures: '连续失败',
    keys: 'Keys',
    healthy: '健康',
    degraded: '降级',
    down: '不可用',
    unknown: '未知',
    resetFailures: '重置失败计数',
    resetSuccess: '失败计数已重置',

    // Config
    config: '路由配置',
    failureThreshold: '故障转移阈值',
    failureThresholdDesc: '连续失败 N 次后切换 Provider（仅智能路由模式）',
    recoverySeconds: '恢复检测时间',
    recoverySecondsDesc: '稳定 N 秒后自动恢复',
    stickySession: '会话粘滞',
    stickySessionDesc: '同一客户端固定路由到同一 Provider',
    maxRetries: '最大重试次数',
    maxRetriesDesc: '单次请求最大重试次数',
    maxLatencyMs: '最大延迟',
    maxLatencyMsDesc: '延迟优先策略下的最大可接受延迟（ms）',
    preferredTolerance: '偏好供应商容忍度',
    preferredToleranceDesc: '当原始供应商评分在最优供应商的 N% 以内时仍优先保留，避免在差距很小时频繁切换',
    save: '保存配置',
    saving: '保存中...',
    configSaved: '配置已保存',

    // Switches
    recentSwitches: '最近路由切换',
    noSwitches: '暂无切换记录',

    // Status overlay
    activeRouting: '当前活跃路由',
    totalRequests: '总请求数',
    uptime: '运行时长',
  },
  en: {
    loading: 'Loading...',
    retry: 'Retry',
    noData: 'No routing data',

    strategy: 'Routing Strategy',
    latency: 'Latency First',
    latencyDesc: 'Route to lowest latency provider',
    cost: 'Cost First',
    costDesc: 'Prefer lower cost providers',
    availability: 'Availability First',
    availabilityDesc: 'Prioritize service availability',
    currentStrategy: 'Current Strategy',
    strategySwitched: 'Strategy switched',

    topology: 'Routing Topology',
    latency_label: 'Latency',
    successRate: 'Success Rate',
    failures: 'Consecutive Failures',
    keys: 'Keys',
    healthy: 'Healthy',
    degraded: 'Degraded',
    down: 'Down',
    unknown: 'Unknown',
    resetFailures: 'Reset Failures',
    resetSuccess: 'Failure counter reset',

    config: 'Routing Config',
    failureThreshold: 'Failover Threshold',
    failureThresholdDesc: 'Switch provider after N consecutive failures (smart routing mode only)',
    recoverySeconds: 'Recovery Time',
    recoverySecondsDesc: 'Auto-recover after N seconds of stability',
    stickySession: 'Sticky Session',
    stickySessionDesc: 'Route same client to same provider',
    maxRetries: 'Max Retries',
    maxRetriesDesc: 'Maximum retries per request',
    maxLatencyMs: 'Max Latency',
    maxLatencyMsDesc: 'Max acceptable latency for latency-first (ms)',
    preferredTolerance: 'Preferred Provider Tolerance',
    preferredToleranceDesc: 'Keep the original provider when its score is within N% of the best, to avoid churn on marginal differences',
    save: 'Save Config',
    saving: 'Saving...',
    configSaved: 'Config saved',

    recentSwitches: 'Recent Switches',
    noSwitches: 'No switch records',

    activeRouting: 'Active Routing',
    totalRequests: 'Total Requests',
    uptime: 'Uptime',
  },
};

// ============================================================
// Helpers
// ============================================================

function relativeTime(ms: number): string {
  if (!ms) return '-';
  const sec = Math.floor((Date.now() - ms) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function formatUptime(ms: number): string {
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  const remainMin = min % 60;
  if (hr < 24) return `${hr}h ${remainMin}m`;
  return `${Math.floor(hr / 24)}d ${hr % 24}h`;
}

function statusColor(status: ProviderHealthStatus): string {
  switch (status) {
    case 'healthy': return '#34d399';
    case 'degraded': return '#fbbf24';
    case 'down': return '#f87171';
    default: return '#6b7280';
  }
}

function statusEmoji(status: ProviderHealthStatus): string {
  switch (status) {
    case 'healthy': return '🟢';
    case 'degraded': return '🟡';
    case 'down': return '🔴';
    default: return '⚪';
  }
}

function strategyIcon(s: RoutingStrategy): string {
  switch (s) {
    case 'latency': return '⚡';
    case 'cost': return '💰';
    case 'availability': return '🛡️';
  }
}

const DEFAULT_CONFIG: RoutingConfig = {
  enabled: false,
  strategy: 'latency',
  costWeights: [],
  maxLatencyMs: 2000,
  failureThreshold: 3,
  recoverySeconds: 30,
  stickySession: false,
  providerTimeoutMs: {},
  maxRetries: 3,
  preferredProviderTolerancePercent: 20,
  updatedAt: 0,
};

// ============================================================
// Component
// ============================================================

export default function RoutingTab({ apiKey, lang }: RoutingTabProps) {
  const t = T[lang];

  const [data, setData] = useState<RoutingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const showMessage = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage(text);
    setMessageType(type);
  };

  // Editable config state
  const [editConfig, setEditConfig] = useState<Partial<RoutingConfig>>({});

  // Fetch routing data
  const fetchRouting = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/admin/routing', {
        headers: { Authorization: `Bearer ${apiKey}` },
        cache: 'no-store',
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || 'Failed to fetch');
      }
      const json: RoutingData = await res.json();
      setData(json);
      setEditConfig({}); // Reset edits on refresh
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  useEffect(() => {
    fetchRouting();
  }, [fetchRouting]);

  // Save config changes. Returns true on success, false on failure.
  const saveConfig = async (updates: Partial<RoutingConfig>): Promise<boolean> => {
    try {
      setSaving(true);
      setMessage('');
      const res = await fetch('/api/admin/routing', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to save');
      showMessage(t.configSaved, 'success');
      setEditConfig({});
      await fetchRouting();
      return true;
    } catch (err) {
      showMessage(err instanceof Error ? err.message : String(err), 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Switch strategy
  const switchStrategy = async (strategy: RoutingStrategy) => {
    const ok = await saveConfig({ strategy });
    if (ok) showMessage(t.strategySwitched, 'success');
  };

  // Reset provider failures
  const resetFailures = async (provider: string) => {
    try {
      const res = await fetch('/api/admin/routing', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'reset_failures', provider }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || 'Failed to reset');
      }
      showMessage(t.resetSuccess, 'success');
      await fetchRouting();
    } catch (err) {
      showMessage(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  // Merge current config with edits
  const config: RoutingConfig = data
    ? { ...data.config, ...editConfig }
    : DEFAULT_CONFIG;

  const status: RoutingStatus | null = data?.status || null;

  // ---- Render ----

  if (loading && !data) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
        <span className="spin" style={{ display: 'inline-block', fontSize: '1.5rem' }}>🔄</span>
        <p>{t.loading}</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ color: '#f87171', marginBottom: '1rem' }}>{error}</p>
        <button onClick={fetchRouting} style={btnStyle('#2563eb')}>
          {t.retry}
        </button>
      </div>
    );
  }

  if (!data) {
    return <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>{t.noData}</div>;
  }

  return (
    <div>
      {/* Smart routing is active whenever this tab is shown — the routing-mode
          selector (traditional vs. smart) above already persists config.enabled,
          so there is no separate enable switch here. */}

      {/* Status overlay bar */}
      <StatusBar status={status} t={t} />

      {/* Strategy Selector */}
      <StrategySelector
        current={config.strategy}
        onSwitch={switchStrategy}
        saving={saving}
        t={t}
      />

      {/* Two-column layout: Topology + Config */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
        gap: '1.5rem',
        marginTop: '1.5rem',
      }} className="routing-grid">
        {/* Provider Topology */}
        <ProviderTopology
          providers={status?.activeProviders || []}
          onResetFailures={resetFailures}
          t={t}
        />

        {/* Config Editor + Recent Switches */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <ConfigEditor
            config={config}
            editConfig={editConfig}
            setEditConfig={setEditConfig}
            onSave={saveConfig}
            saving={saving}
            t={t}
          />
          <RecentSwitches switches={status?.recentSwitches || []} t={t} />
        </div>
      </div>

      {/* Message */}
      {message && (
        <div style={{
          marginTop: '1rem', padding: '0.75rem 1rem', borderRadius: '8px',
          background: messageType === 'error'
            ? 'rgba(248, 113, 113, 0.1)' : 'rgba(52, 211, 153, 0.1)',
          border: `1px solid ${messageType === 'error'
            ? 'rgba(248, 113, 113, 0.2)' : 'rgba(52, 211, 153, 0.2)'}`,
          color: messageType === 'error' ? '#f87171' : '#34d399',
          fontSize: '0.9rem',
        }}>
          {message}
        </div>
      )}

      {/* Mobile overrides */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 768px) {
          .routing-grid { grid-template-columns: 1fr !important; }
        }
      `}} />
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function btnStyle(bg: string): React.CSSProperties {
  return {
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    border: 'none',
    // `background` (not `backgroundColor`) so callers can pass a gradient —
    // the save button uses linear-gradient(...), which backgroundColor ignores,
    // leaving the button transparent and the white label unreadable.
    background: bg,
    color: '#fff',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 500,
    transition: 'all 0.2s',
  };
}

// ---- Status Bar ----

function StatusBar({ status, t }: { status: RoutingStatus | null; t: typeof T['zh'] }) {
  if (!status) return null;

  const topProviders = status.activeProviders
    .filter(p => p.status !== 'down')
    .slice(0, 3);

  const overallHealthy = status.activeProviders.filter(p => p.status === 'healthy').length;
  const totalProviders = status.activeProviders.length;

  return (
    <div className="glass-panel" style={{
      marginBottom: '1.5rem',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: '1rem', padding: '1rem 1.5rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#e5e7eb' }}>
          {t.activeRouting}
        </span>
        <span style={{
          padding: '0.25rem 0.75rem', borderRadius: '9999px',
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2))',
          border: '1px solid rgba(96, 165, 250, 0.3)',
          color: '#60a5fa', fontSize: '0.8rem', fontWeight: 600,
        }}>
          {strategyIcon(status.strategy)} {status.strategy}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.85rem', color: '#9ca3af' }}>
        <span>
          {topProviders.map(p => `${p.displayName} (${Math.round(p.successRate * 100)}%)`).join(' | ') || '-'}
        </span>
        <span>🟢 {overallHealthy}/{totalProviders}</span>
        <span>{t.totalRequests}: {status.totalRequests.toLocaleString()}</span>
        <span>{t.uptime}: {formatUptime(Date.now() - status.routingSince)}</span>
      </div>
    </div>
  );
}

// ---- Strategy Selector ----

function StrategySelector({
  current, onSwitch, saving, t,
}: {
  current: RoutingStrategy;
  onSwitch: (s: RoutingStrategy) => void;
  saving: boolean;
  t: typeof T['zh'];
}) {
  const strategies: Array<{
    key: RoutingStrategy;
    label: string;
    desc: string;
    icon: string;
    gradient: string;
  }> = [
    {
      key: 'latency',
      label: t.latency,
      desc: t.latencyDesc,
      icon: '⚡',
      gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(96, 165, 250, 0.15))',
    },
    {
      key: 'cost',
      label: t.cost,
      desc: t.costDesc,
      icon: '💰',
      gradient: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(245, 158, 11, 0.15))',
    },
    {
      key: 'availability',
      label: t.availability,
      desc: t.availabilityDesc,
      icon: '🛡️',
      gradient: 'linear-gradient(135deg, rgba(52, 211, 153, 0.15), rgba(16, 185, 129, 0.15))',
    },
  ];

  return (
    <div className="glass-panel" style={{ marginBottom: '1.5rem' }}>
      <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600, color: '#e5e7eb' }}>
        {t.strategy}
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        {strategies.map(s => {
          const isActive = current === s.key;
          return (
            <button
              key={s.key}
              onClick={() => !isActive && onSwitch(s.key)}
              disabled={saving || isActive}
              style={{
                padding: '1.25rem',
                borderRadius: '12px',
                border: isActive
                  ? '2px solid rgba(96, 165, 250, 0.5)'
                  : '1px solid rgba(255, 255, 255, 0.06)',
                background: isActive ? s.gradient : 'rgba(255, 255, 255, 0.02)',
                cursor: isActive ? 'default' : 'pointer',
                opacity: saving ? 0.6 : 1,
                transition: 'all 0.2s',
                textAlign: 'left',
                color: '#e5e7eb',
                boxShadow: isActive ? '0 0 15px rgba(59, 130, 246, 0.15)' : 'none',
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{s.icon}</div>
              <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                {s.label}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{s.desc}</div>
              {isActive && (
                <div style={{
                  marginTop: '0.75rem',
                  fontSize: '0.75rem',
                  color: '#60a5fa',
                  fontWeight: 600,
                }}>
                  ✓ {t.currentStrategy}
                </div>
              )}
          </button>
        );
      })}
      </div>
    </div>
  );
}

// ---- Provider Topology ----

function ProviderTopology({
  providers, onResetFailures, t,
}: {
  providers: ProviderHealthInfo[];
  onResetFailures: (p: string) => void;
  t: typeof T['zh'];
}) {
  return (
    <div className="glass-panel routing-grid">
      <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600, color: '#e5e7eb' }}>
        {t.topology}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {providers.length === 0 && (
          <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>{t.noData}</p>
        )}
        {providers.map(p => (
          <ProviderCard
            key={p.provider}
            provider={p}
            onResetFailures={onResetFailures}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}

function ProviderCard({
  provider, onResetFailures, t,
}: {
  provider: ProviderHealthInfo;
  onResetFailures: (p: string) => void;
  t: typeof T['zh'];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      padding: '1rem 1.25rem',
      borderRadius: '12px',
      background: 'rgba(255, 255, 255, 0.02)',
      border: `1px solid ${provider.status === 'down'
        ? 'rgba(248, 113, 113, 0.3)'
        : provider.status === 'degraded'
          ? 'rgba(251, 191, 36, 0.2)'
          : 'rgba(255, 255, 255, 0.06)'}`,
      transition: 'all 0.2s',
    }}>
      {/* Main row */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.1rem' }}>{statusEmoji(provider.status)}</span>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#e5e7eb' }}>
              {provider.displayName}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.15rem' }}>
              {provider.provider}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {/* Latency badge */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t.latency_label}
            </div>
            <div style={{
              fontSize: '0.9rem', fontWeight: 600,
              color: provider.avgLatencyMs < 500 ? '#34d399' : provider.avgLatencyMs < 1500 ? '#fbbf24' : '#f87171',
            }}>
              {provider.avgLatencyMs > 0 ? `${Math.round(provider.avgLatencyMs)}ms` : '-'}
            </div>
          </div>

          {/* Success rate badge */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t.successRate}
            </div>
            <div style={{
              fontSize: '0.9rem', fontWeight: 600,
              color: provider.successRate >= 0.95 ? '#34d399' : provider.successRate >= 0.8 ? '#fbbf24' : '#f87171',
            }}>
              {provider.status !== 'unknown' ? `${Math.round(provider.successRate * 100)}%` : '-'}
            </div>
          </div>

          {/* Failures badge */}
          {provider.consecutiveFailures > 0 && (
            <div style={{
              padding: '0.2rem 0.6rem',
              borderRadius: '9999px',
              background: 'rgba(248, 113, 113, 0.15)',
              border: '1px solid rgba(248, 113, 113, 0.3)',
              color: '#f87171',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}>
              {t.failures}: {provider.consecutiveFailures}
            </div>
          )}

          {/* Expand indicator */}
          <span style={{ color: '#6b7280', fontSize: '0.8rem', transform: expanded ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }}>
            ▼
          </span>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{
          marginTop: '0.75rem', paddingTop: '0.75rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '0.75rem', fontSize: '0.8rem', color: '#9ca3af',
        }}>
          <div>
            <span style={{ color: '#6b7280' }}>Status: </span>
            <span style={{ color: statusColor(provider.status), fontWeight: 600 }}>
              {t[provider.status as keyof typeof t] || provider.status}
            </span>
          </div>
          <div>
            <span style={{ color: '#6b7280' }}>Keys: </span>
            <span>{provider.availableKeys}/{provider.totalKeys}</span>
          </div>
          <div>
            <span style={{ color: '#6b7280' }}>Last success: </span>
            <span>{relativeTime(provider.lastSuccessAt)}</span>
          </div>
          {provider.lastFailureAt > 0 && (
            <div>
              <span style={{ color: '#6b7280' }}>Last failure: </span>
              <span>{relativeTime(provider.lastFailureAt)}</span>
            </div>
          )}
          <div style={{ gridColumn: '1 / -1', marginTop: '0.25rem' }}>
            <button
              onClick={(e) => { e.stopPropagation(); onResetFailures(provider.provider); }}
              style={btnStyle('rgba(59, 130, 246, 0.15)')}
            >
              {t.resetFailures}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Config Editor ----

function ConfigEditor({
  config, editConfig, setEditConfig, onSave, saving, t,
}: {
  config: RoutingConfig;
  editConfig: Partial<RoutingConfig>;
  setEditConfig: (fn: (prev: Partial<RoutingConfig>) => Partial<RoutingConfig>) => void;
  onSave: (updates: Partial<RoutingConfig>) => void;
  saving: boolean;
  t: typeof T['zh'];
}) {
  const hasChanges = Object.keys(editConfig).length > 0;

  return (
    <div className="glass-panel">
      <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600, color: '#e5e7eb' }}>
        {t.config}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Failure Threshold */}
        <ConfigSlider
          label={t.failureThreshold}
          desc={t.failureThresholdDesc}
          value={config.failureThreshold}
          min={1}
          max={20}
          step={1}
          onChange={(v) => setEditConfig(prev => ({ ...prev, failureThreshold: v }))}
        />

        {/* Recovery Seconds */}
        <ConfigSlider
          label={t.recoverySeconds}
          desc={t.recoverySecondsDesc}
          value={config.recoverySeconds}
          min={5}
          max={300}
          step={5}
          unit="s"
          onChange={(v) => setEditConfig(prev => ({ ...prev, recoverySeconds: v }))}
        />

        {/* Max Retries */}
        <ConfigSlider
          label={t.maxRetries}
          desc={t.maxRetriesDesc}
          value={config.maxRetries}
          min={1}
          max={10}
          step={1}
          onChange={(v) => setEditConfig(prev => ({ ...prev, maxRetries: v }))}
        />

        {/* Max Latency (only for latency strategy) */}
        {config.strategy === 'latency' && (
          <ConfigSlider
            label={t.maxLatencyMs}
            desc={t.maxLatencyMsDesc}
            value={config.maxLatencyMs}
            min={100}
            max={5000}
            step={100}
            unit="ms"
            onChange={(v) => setEditConfig(prev => ({ ...prev, maxLatencyMs: v }))}
          />
        )}

        {/* Preferred-provider tolerance */}
        <ConfigSlider
          label={t.preferredTolerance}
          desc={t.preferredToleranceDesc}
          value={config.preferredProviderTolerancePercent}
          min={0}
          max={100}
          step={5}
          unit="%"
          onChange={(v) => setEditConfig(prev => ({ ...prev, preferredProviderTolerancePercent: v }))}
        />

        {/* Sticky Session toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#e5e7eb' }}>{t.stickySession}</div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{t.stickySessionDesc}</div>
          </div>
          <button
            onClick={() => setEditConfig(prev => ({ ...prev, stickySession: !config.stickySession }))}
            style={{
              width: '48px', height: '26px', borderRadius: '13px',
              border: 'none', cursor: 'pointer',
              background: config.stickySession
                ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)'
                : 'rgba(255, 255, 255, 0.1)',
              position: 'relative',
              transition: 'background 0.2s',
            }}
          >
            <div style={{
              width: '20px', height: '20px', borderRadius: '50%',
              background: '#fff',
              position: 'absolute', top: '3px',
              left: config.stickySession ? '25px' : '3px',
              transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }} />
          </button>
        </div>

        {/* Save button */}
        {hasChanges && (
          <button
            onClick={() => onSave(editConfig)}
            disabled={saving}
            style={{
              ...btnStyle('linear-gradient(135deg, #3b82f6, #8b5cf6)'),
              width: '100%', padding: '0.75rem',
              fontWeight: 600, opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? t.saving : t.save}
          </button>
        )}
      </div>
    </div>
  );
}

function ConfigSlider({
  label, desc, value, min, max, step, unit, onChange,
}: {
  label: string;
  desc: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
        <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#e5e7eb' }}>{label}</span>
        <span style={{
          padding: '0.15rem 0.5rem', borderRadius: '6px',
          background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa',
          fontSize: '0.8rem', fontWeight: 600, fontFamily: 'monospace',
        }}>
          {value}{unit || ''}
        </span>
      </div>
      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>{desc}</div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: '100%', height: '4px', borderRadius: '2px',
          appearance: 'none', WebkitAppearance: 'none',
          background: `linear-gradient(to right, #3b82f6 ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.1) ${((value - min) / (max - min)) * 100}%)`,
          outline: 'none', cursor: 'pointer',
        }}
      />
    </div>
  );
}

// ---- Recent Switches ----

function RecentSwitches({
  switches, t,
}: {
  switches: RoutingStatus['recentSwitches'];
  t: typeof T['zh'];
}) {
  return (
    <div className="glass-panel">
      <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600, color: '#e5e7eb' }}>
        {t.recentSwitches}
      </h3>
      {switches.length === 0 ? (
        <p style={{ color: '#6b7280', fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>
          {t.noSwitches}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
          {switches.slice(0, 20).map((sw, i) => (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.6rem 0.75rem', borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.04)',
                fontSize: '0.8rem',
              }}
            >
              {/* Timeline dot */}
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                flexShrink: 0,
              }} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#e5e7eb' }}>
                  <span style={{ color: '#60a5fa', fontWeight: 500 }}>{sw.from}</span>
                  <span style={{ color: '#6b7280', margin: '0 0.35rem' }}>→</span>
                  <span style={{ color: '#34d399', fontWeight: 500 }}>{sw.to}</span>
                </div>
                <div style={{ color: '#6b7280', fontSize: '0.7rem', marginTop: '0.15rem' }}>
                  {sw.reason}
                </div>
              </div>

              <span style={{ color: '#4b5563', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                {relativeTime(sw.timestamp)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
