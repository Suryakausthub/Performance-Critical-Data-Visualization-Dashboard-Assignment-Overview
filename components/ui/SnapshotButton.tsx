'use client';

import * as React from 'react';

export default function SnapshotButton({ title = 'Snapshot' }: { title?: string }) {
  const onClick = React.useCallback(() => {
    // Try to find a chart canvas (prefer one inside a .card)
    const canvas =
      (document.querySelector('article.card canvas') as HTMLCanvasElement | null) ??
      (document.querySelector('canvas') as HTMLCanvasElement | null);

    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `chart-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, []);

  return (
    <button className="btn btn-primary" onClick={onClick} aria-label="Save chart snapshot">
      {title}
    </button>
  );
}
