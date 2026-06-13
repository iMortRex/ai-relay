'use client';

import React, { useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * A small "?" badge that reveals an explanatory popover on hover/click.
 *
 * Shared across the routing-related admin tabs (Smart Routing, Priority Rules,
 * Provider fallback) so each feature carries an inline description of what it
 * does and how it interacts with the others. `tooltip` is rendered with
 * `white-space: pre-wrap`, so multi-line strings keep their line breaks.
 *
 * The popover is rendered into a `document.body` portal with `position: fixed`,
 * computed from the button's bounding rect. This is deliberate: the surrounding
 * `.glass-panel` cards use `backdrop-filter`, which creates a new stacking
 * context per panel — an in-flow absolutely-positioned popover (no matter how
 * high its z-index) gets painted under sibling panels that come later in the
 * DOM. A body portal escapes those stacking contexts entirely.
 */
export default function HelpIcon({ tooltip, align = 'center' }: { tooltip: string; align?: 'left' | 'center' | 'right' }) {
  const [show, setShow] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  // Popover sizing (kept in sync with the styles below) so we can clamp the
  // fixed position to the viewport and honor the align hint.
  const POPOVER_WIDTH = 360;
  const GAP = 8;

  useLayoutEffect(() => {
    if (!show || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    let left =
      align === 'left'
        ? rect.left
        : align === 'right'
          ? rect.right - POPOVER_WIDTH
          : rect.left + rect.width / 2 - POPOVER_WIDTH / 2;
    // Clamp horizontally to the viewport with an 8px margin.
    left = Math.max(8, Math.min(left, window.innerWidth - POPOVER_WIDTH - 8));
    setCoords({ top: rect.bottom + GAP, left });
  }, [show, align]);

  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        ref={btnRef}
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow((v) => !v)}
        aria-label="Help"
        style={{
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          border: '1px solid rgba(96, 165, 250, 0.3)',
          background: 'rgba(59, 130, 246, 0.1)',
          color: '#60a5fa',
          fontSize: '0.7rem',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          lineHeight: 1,
        }}
      >
        ?
      </button>

      {show && coords && typeof document !== 'undefined' &&
        createPortal(
          <div
            role="tooltip"
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              width: `${POPOVER_WIDTH}px`,
              maxWidth: 'calc(100vw - 16px)',
              padding: '1rem',
              borderRadius: '12px',
              background: 'rgba(17, 24, 39, 0.98)',
              border: '1px solid rgba(96, 165, 250, 0.3)',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
              color: '#e5e7eb',
              fontSize: '0.85rem',
              lineHeight: 1.6,
              zIndex: 2000,
              whiteSpace: 'pre-wrap',
              textAlign: 'left',
            }}
          >
            {tooltip}
          </div>,
          document.body
        )}
    </span>
  );
}
