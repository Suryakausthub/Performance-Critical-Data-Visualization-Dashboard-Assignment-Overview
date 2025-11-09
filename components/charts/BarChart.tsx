'use client';
import * as React from 'react';
import { useDashboard } from '@/components/providers/DataProvider';

export default function BarChart() {
  const { derived } = useDashboard();
  const el = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const cvs = el.current;
    if (!cvs) return;
    const dpr = window.devicePixelRatio || 1;
    const w = cvs.clientWidth * dpr;
    const h = cvs.clientHeight * dpr;
    cvs.width = w; cvs.height = h;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);

    // take last ~10s
    const floor = Date.now() - 10_000;
    const win = derived.series.filter(p => p.timestamp >= floor);

    const avg = (arr: number[]) =>
      arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0;

    const inAvg  = avg(win.map(p => Number(p.netInMBps)).filter(Number.isFinite));
    const outAvg = avg(win.map(p => Number(p.netOutMBps)).filter(Number.isFinite));

    const values = [inAvg, outAvg];
    const labels = ['Download', 'Upload'];

    // Fallback text when nothing present
    if ((inAvg === 0 && outAvg === 0) || !win.length) {
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.font = `${14*dpr}px ui-sans-serif, system-ui`;
      ctx.fillText('No network data', 16*dpr, 28*dpr);
      return;
    }

    // bar sizes
    const pad = 20 * dpr;
    const barW = (w - pad * 3) / 2;
    const maxV = Math.max(...values) || 1;
    const scale = (v: number) => (h - pad * 3) * (v / maxV);

    values.forEach((v, i) => {
      const x = pad + i * (barW + pad);
      const bh = scale(v);
      const y = h - pad - bh;

      ctx.fillStyle = 'rgba(120,180,255,.35)';
      ctx.strokeStyle = 'rgba(120,180,255,.9)';
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, bh, 8 * dpr);
      ctx.fill(); ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,.7)';
      ctx.font = `${12*dpr}px ui-sans-serif, system-ui`;
      ctx.fillText(`${labels[i]}: ${v.toFixed(2)} MB/s`, x, y - 6*dpr);
    });
  }, [derived.series]);

  return <canvas ref={el} style={{width:'100%', height: 260}} />;
}
