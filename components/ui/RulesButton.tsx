// components/ui/RulesButton.tsx
'use client';

import * as React from 'react';

export default function RulesButton() {
  const [count, setCount] = React.useState(0);

  const open = React.useCallback(() => {
    window.dispatchEvent(new CustomEvent('rules:open'));
  }, []);

  // Hotkey: Cmd/Ctrl + Shift + R
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const cmd = e.metaKey || e.ctrlKey;
      if (cmd && e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Keep badge in sync (enabled/active rules)
  React.useEffect(() => {
    const onCount = (e: Event) => {
      const n = Number((e as CustomEvent).detail?.count ?? 0);
      setCount(Number.isFinite(n) ? n : 0);
    };
    window.addEventListener('rules:count', onCount as EventListener);
    return () => window.removeEventListener('rules:count', onCount as EventListener);
  }, []);

  return (
    <button
      className="btn btn-alert"
      onClick={open}
      aria-label="Open Alert Rules (Cmd/Ctrl + Shift + R)"
      title="Open Alert Rules (Cmd/Ctrl + Shift + R)"
      data-has-count={count > 0 || undefined}
      style={{ gap: 10 }}
    >
      <span className="btn-alert__icon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path d="M4 6h10M4 12h16M4 18h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
          <circle cx="16" cy="6" r="2" fill="currentColor" opacity=".9"/>
          <circle cx="10" cy="12" r="2" fill="currentColor" opacity=".9"/>
          <circle cx="14" cy="18" r="2" fill="currentColor" opacity=".9"/>
        </svg>
        {count > 0 && (
          <span className="btn-alert__badge" aria-label={`${count} active rules`}>
            {count > 99 ? '99+' : count}
          </span>
        )}
      </span>
      <span className="btn-alert__label">Add Rule</span>
      <span className="btn-alert__kbd" aria-hidden="true">⌘⇧R</span>
    </button>
  );
}
