'use client';

import * as React from 'react';
import FilterButton from '@/components/controls/FilterButton'; // optional if you want a trigger inside

type FormState = {
  category: string;
  fpsMin: number;
  renderMaxMs: number;
  procMaxPct: number;
  memMinMB: number;
  memMaxMB: number;
  anomaliesOnly: boolean;
};

const defaultState: FormState = {
  category: 'all',
  fpsMin: 0,
  renderMaxMs: 10000,
  procMaxPct: 100,
  memMinMB: 0,
  memMaxMB: 1000000,
  anomaliesOnly: false,
};

export default function FilterDrawer() {
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(defaultState);

  // Load current filter from provider when opening
  React.useEffect(() => {
    const onOpen = () => {
      setOpen(true);
      window.dispatchEvent(new CustomEvent('filters:request'));
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onCurrent = (e: Event) => {
      const cur = (e as CustomEvent).detail || {};
      setForm((f) => ({ ...f, ...cur }));
    };

    window.addEventListener('filters:open', onOpen as EventListener);
    window.addEventListener('keydown', onKey);
    window.addEventListener('filters:current', onCurrent as EventListener);
    return () => {
      window.removeEventListener('filters:open', onOpen as EventListener);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('filters:current', onCurrent as EventListener);
    };
  }, []);

  const upd = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const apply = () => {
    window.dispatchEvent(new CustomEvent('filters:apply', { detail: form }));
    setOpen(false);
  };
  const reset = () => {
    window.dispatchEvent(new CustomEvent('filters:reset', { detail: defaultState }));
    setForm(defaultState);
    setOpen(false);
  };

  // Example quick presets
  const loadPreset = (patch: Partial<FormState>) => {
    const next = { ...form, ...patch };
    setForm(next);
    window.dispatchEvent(
      new CustomEvent('filters:preset', { detail: { action: 'load', settings: patch } })
    );
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Filters"
      onClick={() => setOpen(false)}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: 'rgba(10,15,28,.45)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: 360,
          background:
            'linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.04))',
          borderLeft: '1px solid var(--border)',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="card-title">Filters</div>
          <button className="btn btn-ghost" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>

        {/* Category */}
        <label style={{ fontSize: 12, color: 'var(--muted)' }}>Category</label>
        <select
          value={form.category}
          onChange={(e) => upd('category', e.target.value)}
        >
          <option value="all">All</option>
          <option value="alpha">alpha</option>
          <option value="beta">beta</option>
          <option value="gamma">gamma</option>
        </select>

        {/* FPS min */}
        <label style={{ fontSize: 12, color: 'var(--muted)' }}>
          FPS minimum (≥)
        </label>
        <input
          type="number"
          value={form.fpsMin}
          onChange={(e) => upd('fpsMin', Number(e.target.value))}
        />

        {/* Render max */}
        <label style={{ fontSize: 12, color: 'var(--muted)' }}>
          Render time max (ms)
        </label>
        <input
          type="number"
          value={form.renderMaxMs}
          onChange={(e) => upd('renderMaxMs', Number(e.target.value))}
        />

        {/* CPU Proc max */}
        <label style={{ fontSize: 12, color: 'var(--muted)' }}>
          Proc % max (≤)
        </label>
        <input
          type="number"
          value={form.procMaxPct}
          onChange={(e) => upd('procMaxPct', Number(e.target.value))}
        />

        {/* Memory range */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--muted)' }}>
              Memory min (MB)
            </label>
            <input
              type="number"
              value={form.memMinMB}
              onChange={(e) => upd('memMinMB', Number(e.target.value))}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--muted)' }}>
              Memory max (MB)
            </label>
            <input
              type="number"
              value={form.memMaxMB}
              onChange={(e) => upd('memMaxMB', Number(e.target.value))}
            />
          </div>
        </div>

        {/* Anomalies only */}
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={form.anomaliesOnly}
            onChange={(e) => upd('anomaliesOnly', e.target.checked)}
          />
          Show anomalies only
        </label>

        {/* Presets */}
        <div className="toolbar" style={{ gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
          <button
            className="btn btn-ghost"
            onClick={() => loadPreset({ fpsMin: 55 })}
            title="High-FPS only"
          >
            High-FPS
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => loadPreset({ memMinMB: 900, anomaliesOnly: false })}
            title="Hunt large memory"
          >
            Mem-Hunt
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => loadPreset({ renderMaxMs: 20, procMaxPct: 70 })}
            title="Tight perf budget"
          >
            Perf-Budget
          </button>
        </div>

        {/* Actions */}
        <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={reset}>
            Reset
          </button>
          <button className="btn btn-primary" onClick={apply} style={{ marginLeft: 'auto' }}>
            Apply
          </button>
        </div>
      </aside>
    </div>
  );
}
