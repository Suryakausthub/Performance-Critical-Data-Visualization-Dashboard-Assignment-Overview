// components/layout/DraggableGrid.tsx
'use client';

import { useEffect, useState } from 'react';

type Item = { id: string; title: string; render: () => React.ReactNode };

const KEY = 'layout.v1';

export default function DraggableGrid({ items }: { items: Item[] }) {
  const [order, setOrder] = useState<string[]>([]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem(KEY) || '[]');
    const ids = items.map(i => i.id);
    const merged = [...saved.filter((id: string) => ids.includes(id)), ...ids.filter(id => !saved.includes(id))];
    setOrder(merged);
  }, [items]);

  useEffect(() => { if (order.length) localStorage.setItem(KEY, JSON.stringify(order)); }, [order]);

  function onDragStart(e: React.DragEvent<HTMLDivElement>, id: string) {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  }
  function onDrop(e: React.DragEvent<HTMLDivElement>, targetId: string) {
    const src = e.dataTransfer.getData('text/plain');
    if (!src || src === targetId) return;
    const idxS = order.indexOf(src);
    const idxT = order.indexOf(targetId);
    if (idxS === -1 || idxT === -1) return;
    const next = [...order];
    next.splice(idxT, 0, next.splice(idxS, 1)[0]);
    setOrder(next);
  }

  return (
    <section className="grid grid-2" data-draggable-grid>
      {order.map(id => {
        const it = items.find(i => i.id === id)!;
        return (
          <article
            key={id}
            draggable
            onDragStart={(e) => onDragStart(e, id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, id)}
            className="card"
            style={{ cursor: 'grab' }}
          >
            <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{it.title}</span>
              <span className="subtle">⇅ drag</span>
            </div>
            {it.render()}
          </article>
        );
      })}
    </section>
  );
}
