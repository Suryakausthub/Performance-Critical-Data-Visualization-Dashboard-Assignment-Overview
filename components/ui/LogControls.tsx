// components/ui/LogControls.tsx
'use client';

import * as React from 'react';

type Props = {
  /** id of the scroll container that wraps your table (we'll attach listeners there) */
  containerId: string;
};

export default function LogControls({ containerId }: Props) {
  const [q, setQ] = React.useState('');
  const [follow, setFollow] = React.useState(true);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const moRef = React.useRef<MutationObserver | null>(null);

  React.useEffect(() => {
    const el = document.getElementById(containerId) as HTMLDivElement | null;
    containerRef.current = el || null;
    if (!el) return;

    // Sticky header styles (once)
    el.style.setProperty('--thead-shadow', 'inset 0 8px 8px -8px rgba(0,0,0,.35)');
    const thead = el.querySelector('thead') as HTMLElement | null;
    if (thead) {
      thead.style.position = 'sticky';
      thead.style.top = '0';
      thead.style.zIndex = '1';
      thead.style.boxShadow = 'var(--thead-shadow)';
      thead.style.background = 'var(--panel, rgba(22,24,36,.75))';
      thead.style.backdropFilter = 'blur(4px)';
    }

    // Auto-follow tail when rows are appended
    const obs = new MutationObserver(() => {
      if (!follow || !containerRef.current) return;
      const c = containerRef.current;
      c.scrollTop = c.scrollHeight;
    });
    obs.observe(el, { subtree: true, childList: true });
    moRef.current = obs;
    return () => obs.disconnect();
  }, [containerId, follow]);

  // Simple text filter (hides rows by CSS)
  React.useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const rows = Array.from(root.querySelectorAll('tbody tr')) as HTMLTableRowElement[];
    const needle = q.trim().toLowerCase();
    rows.forEach(r => {
      if (!needle) { r.style.display = ''; return; }
      const text = r.textContent?.toLowerCase() || '';
      r.style.display = text.includes(needle) ? '' : 'none';
    });
  }, [q]);

  // Clear rows
  const clear = () => {
    const root = containerRef.current;
    if (!root) return;
    const tbody = root.querySelector('tbody');
    if (tbody) tbody.innerHTML = '';
  };

  // Export CSV of the currently visible rows
  const exportCsv = () => {
    const root = containerRef.current;
    if (!root) return;
    const table = root.querySelector('table');
    if (!table) return;

    const pickCells = (row: HTMLTableRowElement) =>
      Array.from(row.cells).map(c => `"${(c.innerText || '').replace(/"/g, '""')}"`).join(',');

    const head = table.querySelector('thead tr') as HTMLTableRowElement | null;
    const body = Array.from(table.querySelectorAll('tbody tr')) as HTMLTableRowElement[];

    const lines: string[] = [];
    if (head) lines.push(pickCells(head));
    body.forEach(tr => {
      if ((tr as HTMLElement).style.display === 'none') return; // respect filter
      lines.push(pickCells(tr));
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `event-log-${new Date().toISOString().replace(/[:.]/g,'-')}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  return (
    <div className="toolbar" style={{ gap: 8, marginBottom: 6, alignItems: 'center' }}>
      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Search events…"
        aria-label="Search events"
        style={{ minWidth: 220 }}
      />
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <input type="checkbox" checked={follow} onChange={e => setFollow(e.target.checked)} />
        Follow tail
      </label>
      <button className="btn" onClick={exportCsv}>Export CSV</button>
      <button className="btn btn-ghost" onClick={clear}>Clear</button>
    </div>
  );
}
