'use client';
import * as React from 'react';
import { useDashboard } from '@/components/providers/DataProvider';

export default function ScatterPlot() {
  const { derived } = useDashboard();
  const el = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const cvs = el.current; if (!cvs) return;
    const dpr = window.devicePixelRatio || 1;
    const w = cvs.clientWidth * dpr;
    const h = cvs.clientHeight * dpr;
    cvs.width = w; cvs.height = h;
    const ctx = cvs.getContext('2d'); if (!ctx) return;
    ctx.clearRect(0,0,w,h);

    const floor = Date.now() - 60_000;
    const pts = derived.series.filter(d => d.timestamp >= floor && Number.isFinite(d.fps));
    if (!pts.length) {
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.font = `${14*dpr}px ui-sans-serif, system-ui`;
      ctx.fillText('No FPS data', 16*dpr, 28*dpr);
      return;
    }

    const xs = pts.map(p=>p.timestamp);
    const ys = pts.map(p=>Number(p.fps));
    const xmin = Math.min(...xs), xmax = Math.max(...xs);
    const ymin = Math.min(...ys), ymax = Math.max(...ys);
    const pad = 16 * dpr;

    const X = (t:number)=> pad + (w - pad*2) * ((t - xmin) / Math.max(1,(xmax - xmin)));
    const Y = (v:number)=> (h - pad) - (h - pad*2) * ((v - ymin) / Math.max(1,(ymax - ymin)));

    ctx.lineWidth = 2 * dpr;
    ctx.strokeStyle = 'rgba(150, 190, 255, 0.95)';
    ctx.beginPath();
    pts.forEach((p,i)=>{ const x=X(p.timestamp), y=Y(Number(p.fps)); i?ctx.lineTo(x,y):ctx.moveTo(x,y); });
    ctx.stroke();
  }, [derived.series]);

  return <canvas ref={el} style={{width:'100%', height: 260}} />;
}
