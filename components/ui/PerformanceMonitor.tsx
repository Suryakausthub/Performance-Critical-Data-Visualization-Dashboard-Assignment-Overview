'use client';

import * as React from 'react';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';

type Variant = 'toolbar' | 'panel';

function fmtFixed(n: number, decimals = 1, width = 5) {
  const s = n.toFixed(decimals);
  return s.padStart(width, ' ');
}

export default function PerformanceMonitor({ variant = 'toolbar' }: { variant?: Variant }) {
  const m = usePerformanceMonitor();

  const fps      = Number.isFinite(m?.fps) ? m!.fps : 0;
  const renderMs = Number.isFinite(m?.renderMs) ? m!.renderMs : 0;
  const procPct  = Number.isFinite(m?.procPct) ? m!.procPct : 0;
  const heapMB   = Number.isFinite(m?.heapMB) ? m!.heapMB : 0;

  // broadcast samples for rule engine
  React.useEffect(() => {
    const ts = Date.now();
    window.dispatchEvent(new CustomEvent('perf:sample', {
      detail: { ts, metrics: { fps, memory: heapMB, renderMs, procPct } }
    }));
  }, [fps, heapMB, renderMs, procPct]);

  if (variant === 'toolbar') {
    return (
      <ul className="kpi-list" aria-label="live performance" style={{ fontVariantNumeric: 'tabular-nums' }}>
        <li data-color="green">FPS: <strong className="kpi-num">{fmtFixed(fps)}</strong></li>
        <li data-color="amber">Render: <strong className="kpi-num">{fmtFixed(renderMs)}ms</strong></li>
        <li data-color="blue">Proc: <strong className="kpi-num">{fmtFixed(procPct, 0)}</strong>%</li>
        <li data-color="purple">Heap: <strong className="kpi-num">
          {heapMB >= 1024 ? `${(heapMB/1024).toFixed(1).padStart(5,' ')}GB` : `${fmtFixed(heapMB)}MB`}
        </strong></li>
      </ul>
    );
  }

  return (
    <div className="kpi-panel" style={{ fontVariantNumeric: 'tabular-nums' }}>
      <div className="kpi-item" data-color="green"><span>FPS</span><strong>{fmtFixed(fps)}</strong></div>
      <div className="kpi-item" data-color="amber"><span>Render</span><strong>{fmtFixed(renderMs)}ms</strong></div>
      <div className="kpi-item" data-color="blue"><span>Proc</span><strong>{fmtFixed(procPct, 0)}%</strong></div>
      <div className="kpi-item" data-color="purple"><span>Heap</span><strong>{heapMB.toFixed(1)}MB</strong></div>
    </div>
  );
}
