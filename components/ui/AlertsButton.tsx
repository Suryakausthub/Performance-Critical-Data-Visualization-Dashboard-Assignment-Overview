// components/ui/AlertsButton.tsx
'use client';

import * as React from 'react';

/**
 * AlertsButton
 * - Click -> `alerts:open` (open AlertCenter)
 * - Badge shows unread alerts via `alerts:count`
 * - Glows when a rule triggers via `rules:trigger`
 * - Hotkey: Cmd/Ctrl + Shift + A
 */
export default function AlertsButton() {
  const [unread, setUnread] = React.useState(0);
  const [glow, setGlow] = React.useState(false);

  const open = React.useCallback(() => {
    window.dispatchEvent(new CustomEvent('alerts:open'));
  }, []);

  // Hotkey: Cmd/Ctrl + Shift + A
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const cmd = e.metaKey || e.ctrlKey;
      if (cmd && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Keep unread badge in sync
  React.useEffect(() => {
    const onCount = (e: Event) => {
      const n = Number((e as CustomEvent).detail?.count ?? 0);
      setUnread(Number.isFinite(n) ? n : 0);
    };
    window.addEventListener('alerts:count', onCount as EventListener);
    return () => window.removeEventListener('alerts:count', onCount as EventListener);
  }, []);

  // Brief glow on rule triggers
  React.useEffect(() => {
    const onTrig = () => {
      setGlow(true);
      const t = setTimeout(() => setGlow(false), 1600);
      return () => clearTimeout(t);
    };
    window.addEventListener('rules:trigger', onTrig as EventListener);
    return () => window.removeEventListener('rules:trigger', onTrig as EventListener);
  }, []);

  return (
    <button
      className="btn btn-alert"
      onClick={open}
      aria-label="Open Alerts (Cmd/Ctrl + Shift + A)"
      title="Open Alerts (Cmd/Ctrl + Shift + A)"
      data-glow={glow || undefined}
      data-has-count={unread > 0 || undefined}
      style={{ gap: 10 }}
    >
      <span className="btn-alert__icon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path d="M12 3a5 5 0 00-5 5v2.1c0 .6-.2 1.2-.6 1.6L5 13.3c-.9 1 .1 2.7 1.4 2.7h11.3c1.3 0 2.3-1.7 1.4-2.7l-1.4-1.6c-.4-.4-.6-1-.6-1.6V8a5 5 0 00-5-5z" fill="currentColor" opacity=".92"/>
          <path d="M14.5 18a2.5 2.5 0 11-5 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity=".95"/>
        </svg>
        <span className="btn-alert__glow" />
        {unread > 0 && (
          <span className="btn-alert__badge" aria-label={`${unread} unread alerts`}>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </span>
      <span className="btn-alert__label">Alerts</span>
      <span className="btn-alert__kbd" aria-hidden="true">⌘⇧A</span>
    </button>
  );
}
