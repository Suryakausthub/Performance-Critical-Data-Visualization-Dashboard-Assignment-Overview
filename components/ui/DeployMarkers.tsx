'use client';

import React, { useEffect, useState } from 'react';

type Marker = { ts: number; label: string; color?: string };

export default function DeployMarkers() {
  const [markers, setMarkers] = useState<Marker[]>([]);

  useEffect(() => {
    const on = (e: Event) => {
      const ev = e as CustomEvent<Marker>;
      // keep last 10 markers
      setMarkers(m => [...m.slice(-9), ev.detail]);
    };
    window.addEventListener('deploy:marker', on as EventListener);
    return () => window.removeEventListener('deploy:marker', on as EventListener);
  }, []);

  if (!markers.length) return null;

  return (
    <div className="card" style={{ position: 'fixed', right: 16, bottom: 16, width: 280, zIndex: 40 }}>
      <div className="card-title">Deploy Markers</div>
      <div className="data-table" style={{ maxHeight: 220 }}>
        <table>
          <tbody>
            {markers.map((m, i) => (
              <tr key={i}>
                <td style={{ width: 90 }}>{new Date(m.ts).toLocaleTimeString()}</td>
                <td>
                  <span className="pill" style={{ borderColor: 'var(--border-2)' }}>
                    ⎯ {m.label}
                  </span>
                </td>
              </tr>
            ))}
            {!markers.length && (
              <tr><td className="subtle">No markers yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Helper for testing in the console:
 * window.dispatchEvent(new CustomEvent('deploy:marker', { detail: { ts: Date.now(), label: 'v2.3.4' } }))
 */
