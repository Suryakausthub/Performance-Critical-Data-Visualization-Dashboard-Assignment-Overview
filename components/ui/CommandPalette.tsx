'use client';

import React, { useEffect, useState } from 'react';

type Action = { id: string; label: string; detail?: string };

const actions: Action[] = [
  { id: 'range:1m',   label: 'Time range: 1m' },
  { id: 'range:5m',   label: 'Time range: 5m' },
  { id: 'range:1h',   label: 'Time range: 1h' },
  { id: 'toggle:theme', label: 'Toggle light/dark' },
  { id: 'stress:on',  label: 'Stress test: ON',  detail: 'Faster data stream' },
  { id: 'stress:off', label: 'Stress test: OFF', detail: 'Normal data rate' },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const list = actions.filter(a => a.label.toLowerCase().includes(q.toLowerCase()));

  function run(id: string) {
    if (id.startsWith('range:')) {
      window.dispatchEvent(new CustomEvent('dashboard:setRange', { detail: { preset: id.split(':')[1] } }));
    } else if (id === 'toggle:theme') {
      document.documentElement.classList.toggle('light');
    } else if (id.startsWith('stress:')) {
      window.dispatchEvent(new CustomEvent('dashboard:stress', { detail: { on: id.endsWith('on') } }));
    }
    setOpen(false);
  }

  if (!open) return null;
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'grid', placeItems: 'center', zIndex: 50 }}
      onClick={() => setOpen(false)}
    >
      <div className="card" style={{ width: 560 }} onClick={e => e.stopPropagation()}>
        <input
          autoFocus
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Type a command…"
          style={{ width: '100%', marginBottom: 10 }}
        />
        <div className="data-table" style={{ maxHeight: 300 }}>
          <table>
            <tbody>
              {list.map(a => (
                <tr key={a.id} onClick={() => run(a.id)} style={{ cursor: 'pointer' }}>
                  <td style={{ width: 32 }}>⌘K</td>
                  <td>{a.label}</td>
                  <td className="subtle">{a.detail}</td>
                </tr>
              ))}
              {!list.length && (
                <tr>
                  <td className="subtle">No matches</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
