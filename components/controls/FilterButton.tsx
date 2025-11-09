'use client';
import * as React from 'react';

export default function FilterButton() {
  const open = React.useCallback(() => {
    window.dispatchEvent(new CustomEvent('filters:open'));
  }, []);

  return (
    <button className="btn btn-ghost" onClick={open} aria-label="Open filters" title="Open filters">
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden>
          <path d="M3 6h14M5 10h10M7 14h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        Filter
      </span>
    </button>
  );
}
