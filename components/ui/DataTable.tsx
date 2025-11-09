'use client';

import * as React from 'react';
import { useDashboard } from '@/components/providers/DataProvider';

export default function DataTable() {
  const { derived } = useDashboard();
  const dash = '--';

  return (
    <div className="data-table">
      <table>
        <thead>
          <tr>
            <th style={{ width: 180 }}>Time</th>
            <th>Category</th>
            <th title="Frames per second">FPS</th>
            <th title="Render time (ms)">Render</th>
            <th title="CPU %">Proc</th>
            <th title="Heap / Memory (MB)">Mem</th>
            <th>Anom</th>
          </tr>
        </thead>
        <tbody>
          {derived.series.slice(-1000).reverse().map((d: any, i: number) => (
            <tr key={i}>
              <td>{new Date(d.timestamp).toLocaleTimeString()}</td>
              <td>{d.category}</td>
              <td>{Number.isFinite(d.fps) ? Number(d.fps).toFixed(1) : dash}</td>
              <td>
                {Number.isFinite(d.renderMs ?? d.render)
                  ? Number(d.renderMs ?? d.render).toFixed(1)
                  : dash}
              </td>
              <td>{Number.isFinite(d.proc) ? `${Number(d.proc).toFixed(0)}%` : dash}</td>
              <td>
                {Number.isFinite(d.heapMB ?? d.memoryMB)
                  ? Number(d.heapMB ?? d.memoryMB).toFixed(1)
                  : dash}
              </td>
              <td>{d.anomaly ? '!' : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
