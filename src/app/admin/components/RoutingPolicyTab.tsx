'use client';

import { useState, useEffect } from 'react';
import type { AdminData, PriorityRule, PriorityRuleConflict } from '../types';
import PriorityRulesTab from './PriorityRulesTab';
import RoutingTab from './RoutingTab';
import FallbackChainEditor from './FallbackChainEditor';
import HelpIcon from './HelpIcon';
import { useFallbackPolicy } from '../useFallbackPolicy';

interface RoutingPolicyTabProps {
  apiKey: string;
  lang: 'zh' | 'en';
  t: any;
  data: AdminData;

  // Priority rules state (managed by page.tsx)
  priorityRules: PriorityRule[];
  priorityConflicts: PriorityRuleConflict[];
  priorityMessage: string;
  onAddRule: () => void;
  onDeleteRule: (id: string) => void;
  onReorderRules: (rules: PriorityRule[]) => void;
  onSaveRules: (rules: PriorityRule[]) => void;
}

/**
 * Unified Routing Policy tab: traditional mode (priority rules + fallback chains)
 * vs. smart routing mode. The mode toggle drives RoutingConfig.enabled.
 */
export default function RoutingPolicyTab(props: RoutingPolicyTabProps) {
  const {
    apiKey,
    lang,
    t,
    data,
    priorityRules,
    priorityConflicts,
    priorityMessage,
    onAddRule,
    onDeleteRule,
    onReorderRules,
    onSaveRules,
  } = props;

  const [mode, setMode] = useState<'traditional' | 'smart'>('traditional');
  const [loading, setLoading] = useState(false);
  const [modeMessage, setModeMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Fallback chain editor (traditional mode only)
  const fallbackPolicy = useFallbackPolicy(apiKey, t, true, data?.providers || []);

  // Fetch current routing config to initialize mode (enabled → smart, !enabled → traditional)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/admin/routing', {
          headers: { Authorization: `Bearer ${apiKey}` },
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('Failed to fetch routing config');
        const cfg = await res.json();
        if (mounted) {
          setMode(cfg.enabled ? 'smart' : 'traditional');
        }
      } catch (e) {
        console.error('Failed to load routing mode:', e);
      }
    })();
    return () => { mounted = false; };
  }, [apiKey]);

  // Switch mode → persist enabled field to backend
  const handleModeChange = async (newMode: 'traditional' | 'smart') => {
    if (newMode === mode) return;
    setLoading(true);
    setModeMessage(null);
    try {
      const res = await fetch('/api/admin/routing', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ enabled: newMode === 'smart' }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || 'Failed to update routing mode');
      }
      setMode(newMode);
      setModeMessage({ text: t.routingModeSwitchSuccess || 'Routing mode updated', type: 'success' });
    } catch (e) {
      setModeMessage({ text: e instanceof Error ? e.message : 'Failed to switch mode', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Title */}
      <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#f3f4f6' }}>
        {t.routingPolicyTitle}
      </h2>

      {/* Mode toggle */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#e5e7eb' }}>
            {t.routingModeLabel}
          </h3>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {/* Traditional button */}
            <button
              onClick={() => handleModeChange('traditional')}
              disabled={loading}
              style={{
                flex: '1 1 200px',
                padding: '1rem',
                borderRadius: '10px',
                border: mode === 'traditional' ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                background: mode === 'traditional' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(0,0,0,0.2)',
                color: mode === 'traditional' ? '#60a5fa' : '#9ca3af',
                cursor: loading ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{t.routingModeTraditional}</div>
              <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>{t.routingModeTraditionalDesc}</div>
            </button>

            {/* Smart button */}
            <button
              onClick={() => handleModeChange('smart')}
              disabled={loading}
              style={{
                flex: '1 1 200px',
                padding: '1rem',
                borderRadius: '10px',
                border: mode === 'smart' ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                background: mode === 'smart' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0,0,0,0.2)',
                color: mode === 'smart' ? '#34d399' : '#9ca3af',
                cursor: loading ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{t.routingModeSmart}</div>
              <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>{t.routingModeSmartDesc}</div>
            </button>
          </div>

          {/* Mutex warning */}
          <div style={{
            padding: '0.75rem',
            borderRadius: '8px',
            backgroundColor: 'rgba(251, 191, 36, 0.1)',
            border: '1px solid rgba(251, 191, 36, 0.2)',
            color: '#fbbf24',
            fontSize: '0.85rem',
          }}>
            {t.routingModeMutexWarning}
          </div>

          {/* Mode switch message */}
          {modeMessage && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              fontSize: '0.9rem',
              border: modeMessage.type === 'success' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
              backgroundColor: modeMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: modeMessage.type === 'success' ? '#34d399' : '#fca5a5',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span>{modeMessage.text}</span>
              <button
                onClick={() => setModeMessage(null)}
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.5rem' }}
              >
                ×
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Traditional mode content */}
      {mode === 'traditional' && (
        <>
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#e5e7eb' }}>
              {t.routingTraditionalPriorityTitle}
            </h3>
            <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.85rem' }}>
              {t.routingTraditionalPriorityDesc}
            </p>
          </div>

          <PriorityRulesTab
            rules={priorityRules}
            providers={data.providers}
            conflicts={priorityConflicts}
            message={priorityMessage}
            onAddRule={onAddRule}
            onDeleteRule={onDeleteRule}
            onReorderRules={onReorderRules}
            onSaveRules={onSaveRules}
          />

          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#e5e7eb' }}>
              {t.routingTraditionalFallbackTitle}
            </h3>
            <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.85rem' }}>
              {t.routingTraditionalFallbackDesc}
            </p>
          </div>

          <FallbackChainEditor
            data={data}
            t={t}
            selectedProvider={fallbackPolicy.selectedProvider}
            setSelectedProvider={fallbackPolicy.setSelectedProvider}
            providerFallbacks={fallbackPolicy.providerFallbacks}
            activeFallbacks={fallbackPolicy.activeFallbacks}
            setActiveFallbacks={fallbackPolicy.setActiveFallbacks}
            selectedFallbackToAdd={fallbackPolicy.selectedFallbackToAdd}
            setSelectedFallbackToAdd={fallbackPolicy.setSelectedFallbackToAdd}
            operationLoading={fallbackPolicy.operationLoading}
            configMessage={fallbackPolicy.configMessage}
            setConfigMessage={fallbackPolicy.setConfigMessage}
            onSaveFallbacks={fallbackPolicy.handleSaveFallbacks}
            onResetFallbacks={fallbackPolicy.handleResetFallbacks}
          />
        </>
      )}

      {/* Smart routing content */}
      {mode === 'smart' && (
        <>
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#e5e7eb' }}>
                {t.routingSmartSectionTitle}
              </h3>
              <HelpIcon tooltip={t.smartRoutingHelp} align="left" />
            </div>
          </div>

          <RoutingTab apiKey={apiKey} lang={lang} />
        </>
      )}
    </div>
  );
}
