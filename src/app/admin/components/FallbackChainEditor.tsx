'use client';

import React from 'react';
import type { AdminData, ProviderFallbacks } from '../types';
import HelpIcon from './HelpIcon';

interface FallbackChainEditorProps {
  data: AdminData;
  t: any;
  selectedProvider: string | null;
  setSelectedProvider: (provider: string | null) => void;
  providerFallbacks: ProviderFallbacks | null;
  activeFallbacks: string[];
  setActiveFallbacks: (fallbacks: string[]) => void;
  selectedFallbackToAdd: string;
  setSelectedFallbackToAdd: (val: string) => void;
  operationLoading: boolean;
  configMessage: { text: string; type: 'success' | 'error' } | null;
  setConfigMessage: (msg: { text: string; type: 'success' | 'error' } | null) => void;
  onSaveFallbacks: (newChain: string[]) => Promise<void>;
  onResetFallbacks: () => Promise<void>;
}

/**
 * Standalone fallback-chain editor for the Routing Policy tab.
 *
 * Lifted out of ProviderConfigEditor's "Column 2" so the fallback chain is no
 * longer entangled with the Keys tab's per-provider key UI. It carries its own
 * provider <select> (driven by `selectedProvider` from useFallbackPolicy) and
 * its own scoped CSS for `.fallback-item` / `.custom-select`.
 */
export default function FallbackChainEditor(props: FallbackChainEditorProps) {
  const {
    data,
    t,
    selectedProvider,
    setSelectedProvider,
    providerFallbacks,
    activeFallbacks,
    setActiveFallbacks,
    selectedFallbackToAdd,
    setSelectedFallbackToAdd,
    operationLoading,
    configMessage,
    setConfigMessage,
    onSaveFallbacks,
    onResetFallbacks,
  } = props;

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .fallback-item {
          transition: all 0.2s ease;
        }
        .fallback-item:hover {
          background-color: rgba(255, 255, 255, 0.02) !important;
        }
        .custom-select {
          appearance: none;
          background-image: url("data:image/svg+xml;utf8,<svg fill='none' height='24' stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><polyline points='6 9 12 15 18 9'/></svg>");
          background-repeat: no-repeat;
          background-position: right 0.5rem center;
          background-size: 1rem;
          padding-right: 2rem !important;
        }
      `}} />

      {/* Title + help */}
      <div>
        <h3 style={{ fontSize: '1.1rem', marginTop: 0, marginBottom: '0.35rem', color: '#e5e7eb', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {t.fallbackChainTitle}
          <HelpIcon tooltip={t.fallbackChainHelp} align="left" />
        </h3>
        <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.85rem' }}>
          {t.fallbackChainSubtitle}
        </p>
      </div>

      {/* Provider selector */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>{t.fallbackProviderLabel}</span>
        <select
          value={selectedProvider || ''}
          onChange={(e) => setSelectedProvider(e.target.value || null)}
          className="custom-select"
          style={{
            flex: '1 1 220px',
            minWidth: 0,
            padding: '0.5rem 0.8rem',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
            color: '#fff',
            fontSize: '0.85rem',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="">{t.fallbackProviderPlaceholder}</option>
          {data.providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.id})
            </option>
          ))}
        </select>
      </div>

      {/* Inline message */}
      {configMessage && (
        <div style={{
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          fontSize: '0.9rem',
          border: configMessage.type === 'success' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
          backgroundColor: configMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: configMessage.type === 'success' ? '#34d399' : '#fca5a5',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '0.75rem',
        }}>
          <span style={{ minWidth: 0, overflowWrap: 'anywhere', whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>{configMessage.text}</span>
          <button
            onClick={() => setConfigMessage(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.5rem', flexShrink: 0, lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      )}

      {/* No provider selected */}
      {!selectedProvider && (
        <div style={{ color: '#6b7280', fontSize: '0.9rem', padding: '1.5rem', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 10 }}>
          {t.fallbackSelectProviderHint}
        </div>
      )}

      {/* Loading */}
      {selectedProvider && operationLoading && !providerFallbacks && (
        <div style={{ color: '#9ca3af', textAlign: 'center', padding: '2rem' }}>
          {t.loadingConfig}
        </div>
      )}

      {/* Editor body */}
      {selectedProvider && providerFallbacks && (
        <>
          {/* Static / Managed indicator */}
          <div style={{
            padding: '0.75rem',
            borderRadius: '8px',
            backgroundColor: providerFallbacks.isOverride ? 'rgba(16, 185, 129, 0.08)' : 'rgba(156, 163, 175, 0.08)',
            border: providerFallbacks.isOverride ? '1px solid rgba(16, 185, 129, 0.15)' : '1px solid rgba(156, 163, 175, 0.15)',
            color: providerFallbacks.isOverride ? '#34d399' : '#9ca3af',
            fontSize: '0.85rem',
            lineHeight: '1.4',
          }}>
            {providerFallbacks.isOverride ? (
              <span>{t.kvFallbackActive}</span>
            ) : (
              <span>{t.kvFallbackStatic}</span>
            )}
          </div>

          {/* Reorderable Chain List */}
          <div style={{
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '8px',
            backgroundColor: 'rgba(0, 0, 0, 0.15)',
            padding: '0.25rem 0',
          }}>
            {activeFallbacks.length > 0 ? (
              activeFallbacks.map((fbEntry, idx) => {
                const colonIdx = fbEntry.indexOf(':');
                const fbId = colonIdx >= 0 ? fbEntry.slice(0, colonIdx) : fbEntry;
                const fbModel = colonIdx >= 0 ? fbEntry.slice(colonIdx + 1) : '';
                const fbName = data.providers.find(p => p.id === fbId)?.name || fbId;
                const models = providerFallbacks.availableModels?.[fbId] || [];
                return (
                  <div
                    key={`${fbEntry}-${idx}`}
                    className="fallback-item"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.6rem 0.8rem',
                      borderBottom: idx < activeFallbacks.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                      gap: '0.5rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                      <span style={{
                        color: '#9ca3af',
                        fontSize: '0.8rem',
                        fontFamily: 'monospace',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(255,255,255,0.06)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>{idx + 1}</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#f3f4f6', flexShrink: 0, maxWidth: '64px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fbName}</span>

                      {/* Model selector */}
                      <select
                        value={fbModel}
                        onChange={(e) => {
                          const newList = [...activeFallbacks];
                          newList[idx] = e.target.value ? `${fbId}:${e.target.value}` : fbId;
                          setActiveFallbacks(newList);
                        }}
                        disabled={operationLoading}
                        className="custom-select"
                        style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          backgroundColor: 'rgba(0, 0, 0, 0.25)',
                          color: fbModel ? '#60a5fa' : '#9ca3af',
                          fontSize: '0.75rem',
                          outline: 'none',
                          maxWidth: '140px',
                          flexShrink: 1,
                          minWidth: '60px',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="">{t.modelSelectorAuto}</option>
                        {models.map(m => (
                          <option key={m.id} value={m.id}>{m.displayName}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                      {/* Up button */}
                      <button
                        onClick={() => {
                          if (idx === 0) return;
                          const nextList = [...activeFallbacks];
                          const tmp = nextList[idx];
                          nextList[idx] = nextList[idx - 1];
                          nextList[idx - 1] = tmp;
                          setActiveFallbacks(nextList);
                        }}
                        disabled={idx === 0 || operationLoading}
                        style={{
                          padding: '0.2rem 0.4rem',
                          borderRadius: '4px',
                          border: '1px solid rgba(255,255,255,0.08)',
                          backgroundColor: 'rgba(255,255,255,0.04)',
                          color: '#d1d5db',
                          fontSize: '0.75rem',
                          cursor: idx === 0 || operationLoading ? 'not-allowed' : 'pointer',
                        }}
                      >
                        ▲
                      </button>
                      {/* Down button */}
                      <button
                        onClick={() => {
                          if (idx === activeFallbacks.length - 1) return;
                          const nextList = [...activeFallbacks];
                          const tmp = nextList[idx];
                          nextList[idx] = nextList[idx + 1];
                          nextList[idx + 1] = tmp;
                          setActiveFallbacks(nextList);
                        }}
                        disabled={idx === activeFallbacks.length - 1 || operationLoading}
                        style={{
                          padding: '0.2rem 0.4rem',
                          borderRadius: '4px',
                          border: '1px solid rgba(255,255,255,0.08)',
                          backgroundColor: 'rgba(255,255,255,0.04)',
                          color: '#d1d5db',
                          fontSize: '0.75rem',
                          cursor: idx === activeFallbacks.length - 1 || operationLoading ? 'not-allowed' : 'pointer',
                        }}
                      >
                        ▼
                      </button>
                      {/* Remove button */}
                      <button
                        onClick={() => {
                          const nextList = activeFallbacks.filter((_, i) => i !== idx);
                          setActiveFallbacks(nextList);
                        }}
                        disabled={operationLoading}
                        style={{
                          padding: '0.2rem 0.4rem',
                          borderRadius: '4px',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          color: '#ef4444',
                          fontSize: '0.75rem',
                          cursor: operationLoading ? 'not-allowed' : 'pointer',
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ color: '#9ca3af', fontSize: '0.9rem', padding: '1.5rem', textAlign: 'center' }}>
                {t.noFallbacksConfigured}
              </div>
            )}
          </div>

          {/* Add Fallback Form */}
          {(() => {
            const usedProviders = activeFallbacks.map(fb => {
              const ci = fb.indexOf(':');
              return ci >= 0 ? fb.slice(0, ci) : fb;
            });
            const availableToAdd = data.providers.filter(p => p.id !== selectedProvider && !usedProviders.includes(p.id)) || [];
            return availableToAdd.length > 0 ? (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select
                  value={selectedFallbackToAdd}
                  onChange={(e) => setSelectedFallbackToAdd(e.target.value)}
                  disabled={operationLoading}
                  className="custom-select"
                  style={{
                    flex: 1,
                    padding: '0.5rem 0.8rem',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    backgroundColor: 'rgba(0, 0, 0, 0.25)',
                    color: '#fff',
                    fontSize: '0.85rem',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {availableToAdd.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.id})
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    if (!selectedFallbackToAdd) return;
                    setActiveFallbacks([...activeFallbacks, selectedFallbackToAdd]);
                  }}
                  disabled={operationLoading || !selectedFallbackToAdd}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    color: '#eee',
                    fontSize: '0.85rem',
                    cursor: operationLoading || !selectedFallbackToAdd ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; }}
                  onMouseLeave={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; }}
                >
                  {t.btnAddFallback}
                </button>
              </div>
            ) : (
              <div style={{ color: '#9ca3af', fontSize: '0.8rem', textAlign: 'center' }}>
                {t.noOtherProviders}
              </div>
            );
          })()}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            {providerFallbacks.isOverride && (
              <button
                onClick={onResetFallbacks}
                disabled={operationLoading}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#f87171',
                  fontSize: '0.9rem',
                  cursor: operationLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'; }}
                onMouseLeave={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'; }}
              >
                {t.btnResetFallbacks}
              </button>
            )}
            <button
              onClick={() => onSaveFallbacks(activeFallbacks)}
              disabled={operationLoading || JSON.stringify(activeFallbacks) === JSON.stringify(providerFallbacks.current)}
              style={{
                padding: '0.5rem 1.25rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#2563eb',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '0.9rem',
                cursor: operationLoading || JSON.stringify(activeFallbacks) === JSON.stringify(providerFallbacks.current) ? 'not-allowed' : 'pointer',
                opacity: operationLoading || JSON.stringify(activeFallbacks) === JSON.stringify(providerFallbacks.current) ? 0.5 : 1,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = '#1d4ed8'; }}
              onMouseLeave={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = '#2563eb'; }}
            >
              {t.btnSaveFallbacks}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
