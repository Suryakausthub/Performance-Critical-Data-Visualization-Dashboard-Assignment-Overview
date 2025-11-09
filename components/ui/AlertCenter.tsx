// components/ui/AlertCenter.tsx
'use client';

import * as React from 'react';

type Level = 'INFO' | 'WARN' | 'CRIT';
type Source = 'rule' | 'system' | 'manual';

type AlertItem = {
  id: string; ts: number; level: Level; source: Source; title: string; detail?: string;
};

type PushDetail =
  | { level: Level; title: string; detail?: string; source?: Source }
  | { rule?: { label?: string; metric?: string; comparator?: string; threshold?: unknown; forSec?: number }; level?: Level; message?: string };

const STORE = 'alerts.v1';

function load(): { items: AlertItem[]; unread: number } {
  try { return JSON.parse(localStorage.getItem(STORE) || '{"items":[],"unread":0}'); }
  catch { return { items: [], unread: 0 }; }
}
function save(items: AlertItem[], unread: number) {
  try { localStorage.setItem(STORE, JSON.stringify({ items, unread })); } catch {}
}
function rel(t: number) {
  const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); return `${h}h ago`;
}
function dot(level: Level) {
  const c = level === 'CRIT' ? '#ef4444' : level === 'WARN' ? '#f59e0b' : '#22c55e';
  return <span aria-hidden style={{display:'inline-block',width:8,height:8,borderRadius:8,background:c,boxShadow:`0 0 0 4px ${c}22`,marginRight:8}} />;
}

export default function AlertCenter() {
  const [open, setOpen] = React.useState(false);
  const [{ items, unread }, setState] = React.useState(load());
  const [filter, setFilter] = React.useState<'ALL' | Level>('ALL');
  const [paused, setPaused] = React.useState(false);

  const setUnread = React.useCallback((n: number) => {
    setState(s => ({ ...s, unread: n }));
    window.dispatchEvent(new CustomEvent('alerts:count', { detail: { count: n } }));
  }, []);

  React.useEffect(() => { save(items, unread); }, [items, unread]);

  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('alerts:count', { detail: { count: unread } }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const onOpen = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      const cmd = e.metaKey || e.ctrlKey;
      if (cmd && e.shiftKey && e.key.toLowerCase() === 'a') setOpen(true);
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('alerts:open', onOpen as EventListener);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('alerts:open', onOpen as EventListener);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const push = React.useCallback((ai: Omit<AlertItem, 'id' | 'ts'>) => {
    const item: AlertItem = { id: crypto.randomUUID(), ts: Date.now(), ...ai };
    setState(s => {
      const next = [item, ...s.items].slice(0, 200);
      return { items: next, unread: open || paused ? s.unread : s.unread + 1 };
    });
  }, [open, paused]);

  React.useEffect(() => {
    const onTrig = (e: Event) => {
      const d = (e as CustomEvent).detail as PushDetail;
      const level = (d as any).level ?? 'INFO';
      const r = (d as any).rule;
      const title = (d as any).title || r?.label || 'Rule fired';
      const extra =
        (d as any).message ||
        (r ? `${r.metric ?? ''} ${r.comparator ?? ''} ${Array.isArray(r.threshold) ? r.threshold.join('..') : r.threshold ?? ''} for ${r.forSec ?? ''}s` : undefined);
      push({ level: level as Level, source: 'rule', title, detail: extra });
    };
    window.addEventListener('rules:trigger', onTrig as EventListener);
    return () => window.removeEventListener('rules:trigger', onTrig as EventListener);
  }, [push]);

  React.useEffect(() => {
    const onAny = (e: Event) => {
      const d = (e as CustomEvent).detail as PushDetail;
      const level = (d as any).level ?? 'INFO';
      const title = (d as any).title || (d as any).message || 'Alert';
      push({ level: level as Level, source: 'manual', title, detail: (d as any).detail });
    };
    window.addEventListener('dashboard:alert', onAny as EventListener);
    window.addEventListener('alerts:push', onAny as EventListener);
    return () => {
      window.removeEventListener('dashboard:alert', onAny as EventListener);
      window.removeEventListener('alerts:push', onAny as EventListener);
    };
  }, [push]);

  React.useEffect(() => { if (open && !paused && unread) setUnread(0); }, [open, paused, unread, setUnread]);

  const filtered = items.filter(i => (filter === 'ALL' ? true : i.level === filter));
  if (!open) return null;

  return (
    <div
      role="dialog" aria-modal="true" aria-label="Alerts"
      onMouseDown={() => setOpen(false)}                // close backdrop
      style={{ position:'fixed', inset:0, zIndex:70, background:'rgba(10,15,28,.55)', backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)', display:'grid', placeItems:'center' }}
    >
      <div
        className="card"
        onMouseDown={e => e.stopPropagation()}          // prevent backdrop close
        style={{ width: 800, maxWidth:'94vw', borderRadius:16, padding:16 }}
      >
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
          <div className="card-title">Alerts</div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <label style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12, color:'var(--muted)' }}>
              <input type="checkbox" checked={paused} onChange={e => setPaused(e.target.checked)} />
              Pause badge reset
            </label>
            <button className="btn btn-ghost" onClick={() => { setState(s => ({ ...s, items: [] })); setUnread(0); }}>Clear</button>
            <button type="button" className="btn btn-ghost" onClick={(e) => { e.stopPropagation(); setOpen(false); }} aria-label="Close">Close</button>
          </div>
        </div>

        <div className="toolbar" style={{ marginTop:8, marginBottom:8, gap:8 }}>
          {(['ALL','INFO','WARN','CRIT'] as const).map(k => (
            <button
              key={k} className="btn btn-ghost" onClick={() => setFilter(k)} aria-pressed={filter === k}
              style={{ borderColor: filter === k ? 'var(--ring)' : undefined, boxShadow: filter === k ? '0 0 0 3px rgba(124,92,255,.20)' : undefined, fontWeight:700 }}
            >
              {k === 'ALL' ? 'All' : k}
            </button>
          ))}
        </div>

        <div className="data-table" style={{ maxHeight: 440 }}>
          <table>
            <thead><tr><th style={{width:110}}>Time</th><th style={{width:80}}>Level</th><th>Title</th><th style={{width:90}}>Source</th></tr></thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id}>
                  <td>{rel(a.ts)}</td>
                  <td style={{ whiteSpace:'nowrap', fontWeight:800 }}>{dot(a.level)}{a.level}</td>
                  <td><div style={{ fontWeight:700 }}>{a.title}</div>{a.detail && <div style={{ color:'var(--muted)', fontSize:12, marginTop:2 }}>{a.detail}</div>}</td>
                  <td style={{ textTransform:'capitalize' }}>{a.source}</td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={4} className="subtle">No alerts.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
