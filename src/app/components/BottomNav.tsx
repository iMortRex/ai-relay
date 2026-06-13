'use client';

// ============================================================
// AI Relay — Bottom Navigation Bar (Mobile)
// ============================================================
//
// DESIGN-SPEC.md §4.3 — Mobile bottom navigation
// - Max 5 items visible, rest go to "more" drawer
// - Current tab highlighted with accent color
// - Fixed bottom, height 56px + safe-area-inset
// - Only renders on screens < 640px

import { useState, useEffect } from 'react';
import { BottomSheet } from './BottomSheet';

export type TabId = 'setup' | 'overview' | 'keys' | 'models' | 'health' | 'routingPolicy' | 'security' | 'usage' | 'logs' | 'tools' | 'webhooks';

interface NavItem {
  id: TabId;
  icon: string;
  label: string;
  group: 'primary' | 'secondary';
}

const NAV_ITEMS: NavItem[] = [
  { id: 'setup',   icon: '⚙️', label: '配置',   group: 'primary' },
  { id: 'overview', icon: '📊', label: '概览',   group: 'primary' },
  { id: 'keys',    icon: '🔑', label: 'Key',    group: 'primary' },
  { id: 'health',  icon: '🏥', label: '健康',   group: 'primary' },
  { id: 'usage',   icon: '📈', label: '用量',   group: 'primary' },
  { id: 'routingPolicy', icon: '🧭', label: '路由策略', group: 'secondary' },
  { id: 'security', icon: '🛡️', label: '安全',   group: 'secondary' },
  { id: 'models',  icon: '🤖', label: '模型',   group: 'secondary' },
  { id: 'logs',    icon: '📋', label: '日志',   group: 'secondary' },
  { id: 'tools',   icon: '🛠️', label: '工具',   group: 'secondary' },
  { id: 'webhooks', icon: '🔔', label: 'Webhook', group: 'secondary' },
];

const primaryItems = NAV_ITEMS.filter(i => i.group === 'primary');
const secondaryItems = NAV_ITEMS.filter(i => i.group === 'secondary');

interface BottomNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (!isMobile) return null;

  const handleTabChange = (tab: TabId) => {
    onTabChange(tab);
    setMoreOpen(false);
  };

  const isSecondaryActive = secondaryItems.some(i => i.id === activeTab);

  return (
    <>
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'calc(56px + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        background: '#12121a',
        borderTop: '1px solid #2a2a40',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        zIndex: 9990,
      }}>
        {primaryItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '6px 12px',
                minWidth: 56,
                minHeight: 44,
                position: 'relative',
                color: isActive ? '#6366f1' : '#8888aa',
                transition: 'color 0.15s',
              }}
            >
              <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{item.icon}</span>
              <span style={{
                fontSize: '0.65rem',
                fontWeight: isActive ? 600 : 400,
                whiteSpace: 'nowrap',
              }}>
                {item.label}
              </span>
              {isActive && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  width: 24,
                  height: 2,
                  borderRadius: 1,
                  background: '#6366f1',
                }} />
              )}
            </button>
          );
        })}

        {/* "More" button */}
        <button
          onClick={() => setMoreOpen(true)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '6px 12px',
            minWidth: 56,
            minHeight: 44,
            color: isSecondaryActive ? '#6366f1' : '#8888aa',
            transition: 'color 0.15s',
          }}
        >
          <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>⋯</span>
          <span style={{
            fontSize: '0.65rem',
            fontWeight: isSecondaryActive ? 600 : 400,
            whiteSpace: 'nowrap',
          }}>
            更多
          </span>
        </button>
      </nav>

      {/* More drawer */}
      <BottomSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title="更多功能"
      >
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
          padding: '8px 0 16px',
        }}>
          {secondaryItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '16px 8px',
                  background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  border: isActive ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid #2a2a40',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  color: isActive ? '#6366f1' : '#e0e0e0',
                  transition: 'all 0.15s',
                  minHeight: 44,
                }}
              >
                <span style={{ fontSize: '1.5rem' }}>{item.icon}</span>
                <span style={{ fontSize: '0.8rem', fontWeight: isActive ? 600 : 400 }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </BottomSheet>
    </>
  );
}
