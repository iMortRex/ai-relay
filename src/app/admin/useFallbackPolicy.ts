// ============================================================
// AI Relay Admin — useFallbackPolicy Hook
// ============================================================
// Standalone fallback-chain management for the Routing Policy tab.
//
// This deliberately keeps its OWN provider-selection state
// (`selectedProvider`) rather than reusing the Keys tab's selection, so the
// two tabs never fight over a single shared `selectedProvider`. It talks to the
// same GET/PUT/DELETE `/api/admin/providers/{id}/fallbacks` endpoints the Keys
// tab used, but only loads fallbacks (not API keys) since this tab has no key UI.

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ProviderFallbacks } from './types';

export function useFallbackPolicy(apiKey: string, t: any, authenticated: boolean) {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [providerFallbacks, setProviderFallbacks] = useState<ProviderFallbacks | null>(null);
  const [activeFallbacks, setActiveFallbacks] = useState<string[]>([]);
  const [selectedFallbackToAdd, setSelectedFallbackToAdd] = useState('');
  const [operationLoading, setOperationLoading] = useState(false);
  const [configMessage, setConfigMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const tRef = useRef(t);
  tRef.current = t;

  const fetchFallbacks = useCallback(async (providerId: string) => {
    setOperationLoading(true);
    setConfigMessage(null);
    try {
      const res = await fetch(`/api/admin/providers/${providerId}/fallbacks`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error('Failed to fetch fallback configuration');
      }
      const fallbacksData = await res.json();
      setProviderFallbacks({
        current: fallbacksData.fallbacks,
        staticDefault: fallbacksData.staticDefault,
        staticDefaults: fallbacksData.staticDefaults || [],
        isOverride: fallbacksData.isOverride,
        availableModels: fallbacksData.availableModels || {},
      });
      setActiveFallbacks(fallbacksData.fallbacks || []);
    } catch (e) {
      setConfigMessage({ text: e instanceof Error ? e.message : tRef.current.msgLoadConfigFailed, type: 'error' });
    } finally {
      setOperationLoading(false);
    }
  }, [apiKey]);

  // Load the selected provider's fallback chain; clear when nothing is selected.
  useEffect(() => {
    if (selectedProvider && authenticated) {
      fetchFallbacks(selectedProvider);
    } else {
      setProviderFallbacks(null);
      setActiveFallbacks([]);
    }
  }, [selectedProvider, authenticated, fetchFallbacks]);

  const handleSaveFallbacks = useCallback(async (newChain: string[]) => {
    if (!selectedProvider) return;
    setOperationLoading(true);
    setConfigMessage(null);
    try {
      const res = await fetch(`/api/admin/providers/${selectedProvider}/fallbacks`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ fallbacks: newChain }),
      });
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error?.message || 'Failed to save fallback chain');
      }
      setConfigMessage({ text: tRef.current.msgFallbackSaved, type: 'success' });
      await fetchFallbacks(selectedProvider);
    } catch (e) {
      setConfigMessage({ text: e instanceof Error ? e.message : tRef.current.alertSaveFallbackFailed, type: 'error' });
    } finally {
      setOperationLoading(false);
    }
  }, [selectedProvider, apiKey, fetchFallbacks]);

  const handleResetFallbacks = useCallback(async () => {
    if (!selectedProvider) return;
    if (!confirm(tRef.current.confirmResetFallbacks)) return;
    setOperationLoading(true);
    setConfigMessage(null);
    try {
      const res = await fetch(`/api/admin/providers/${selectedProvider}/fallbacks`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error?.message || 'Failed to reset fallbacks');
      }
      setConfigMessage({ text: tRef.current.msgFallbackReset, type: 'success' });
      await fetchFallbacks(selectedProvider);
    } catch (e) {
      setConfigMessage({ text: e instanceof Error ? e.message : tRef.current.alertResetFallbackFailed, type: 'error' });
    } finally {
      setOperationLoading(false);
    }
  }, [selectedProvider, apiKey, fetchFallbacks]);

  return {
    selectedProvider, setSelectedProvider,
    providerFallbacks,
    activeFallbacks, setActiveFallbacks,
    selectedFallbackToAdd, setSelectedFallbackToAdd,
    operationLoading,
    configMessage, setConfigMessage,
    handleSaveFallbacks,
    handleResetFallbacks,
  };
}
