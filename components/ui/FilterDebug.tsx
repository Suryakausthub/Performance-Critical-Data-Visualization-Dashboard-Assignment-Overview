'use client';
import * as React from 'react';
import { useDashboard } from '@/components/providers/DataProvider';

export default function FilterDebug() {
  const { filter, derived, bucket } = useDashboard();

  return (
    <div
      className="pill"
      style={{
        display:'inline-flex',gap:10,alignItems:'center',
        padding:'8px 12px', borderRadius:12, border:'1px solid var(--border)',
        background:'rgba(255,255,255,.06)', fontSize:12
      }}
      title="Live view of currently applied filters and pass counts"
    >
      <span style={{opacity:.8}}>Filter:</span>
      <code>cat={filter.category}</code>
      <code>fps≥{filter.fpsMin}</code>
      <code>render≤{filter.renderMaxMs}ms</code>
      <code>proc≤{filter.procMaxPct}%</code>
      <code>mem {filter.memMinMB}..{filter.memMaxMB}MB</code>
      {filter.anomaliesOnly ? <code>anomaliesOnly</code> : null}
      <span style={{opacity:.75, marginLeft:8}}>• bucket: {bucket}</span>
      <span style={{opacity:.9, fontWeight:800}}>• rows: {derived.series.length}</span>
    </div>
  );
}
