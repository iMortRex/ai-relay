'use client';

// ============================================================
// AI Relay — Bottom Sheet Component (Mobile)
// ============================================================
//
// DESIGN-SPEC.md §4.2 — Bottom Sheet替代Modal
// - 圆角：16px（仅顶部）
// - 最大高度：85vh
// - 拖拽手柄：顶部居中 40x4 圆角条
// - 背景遮罩：rgba(0,0,0,.6) + backdrop-filter: blur(4px)
// - 关闭方式：下拉手势 / 点击遮罩 / 关闭按钮

import { useEffect, useRef, useCallback } from 'react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  const isDragging = useRef(false);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    isDragging.current = true;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current || !sheetRef.current) return;
    currentY.current = e.touches[0].clientY;
    const delta = currentY.current - startY.current;
    if (delta > 0) {
      sheetRef.current.style.transform = `translateY(${delta}px)`;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current || !sheetRef.current) return;
    isDragging.current = false;
    const delta = currentY.current - startY.current;
    if (delta > 100) {
      // Dismiss if dragged down more than 100px
      onClose();
    }
    // Reset transform
    sheetRef.current.style.transform = '';
  }, [onClose]);

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        animation: 'fadeIn 200ms ease-out',
      }}
    >
      <div
        ref={sheetRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          width: '100%',
          maxWidth: '600px',
          maxHeight: '85vh',
          background: '#12121a',
          borderRadius: '16px 16px 0 0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideUp 250ms ease-out',
        }}
      >
        {/* Drag handle */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '12px 0 4px',
          cursor: 'grab',
          flexShrink: 0,
        }}>
          <div style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            background: 'rgba(255, 255, 255, 0.2)',
          }} />
        </div>

        {/* Header */}
        {title && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '4px 20px 12px',
            borderBottom: '1px solid #2a2a40',
            flexShrink: 0,
          }}>
            <span style={{
              fontSize: '1rem',
              fontWeight: 600,
              color: '#e0e0e0',
            }}>
              {title}
            </span>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#8888aa',
                cursor: 'pointer',
                fontSize: '1.25rem',
                padding: '4px',
                lineHeight: 1,
              }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        )}

        {/* Content */}
        <div style={{
          padding: '16px 20px',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          flex: 1,
        }}>
          {children}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}} />
    </div>
  );
}
