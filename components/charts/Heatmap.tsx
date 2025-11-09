'use client';
import * as React from 'react';
import { useDashboard } from '@/components/providers/DataProvider';

const MAX_POINTS = 5000;
const SAMPLE_COUNT = 180;

export default function Heatmap() {
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
    ctx.clearRect(0,0,w,h);

    const recent = derived.series.slice(-MAX_POINTS);
    const mem = recent
      .map(d => Number(d.heapMB))
      .filter(Number.isFinite);
    if (!mem.length) {
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.font = `${14*dpr}px ui-sans-serif, system-ui`;
      ctx.fillText('No memory data', 16*dpr, 28*dpr);
      return;
    }

    const min = Math.min(...mem);
    const max = Math.max(...mem);
    const span = Math.max(1, max - min);

    const pad = 24 * dpr;
    const innerW = w - pad * 2;
    const innerH = h - pad * 3;
    const baseY = pad + innerH;

    // background + grid
    ctx.fillStyle = 'rgba(6,16,32,0.9)';
    ctx.fillRect(pad, pad, innerW, innerH);
    ctx.strokeStyle = 'rgba(120,150,200,0.25)';
    ctx.strokeRect(pad, pad, innerW, innerH);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    for (let i = 1; i < 5; i++) {
      const y = pad + (innerH / 5) * i;
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(pad + innerW, y);
      ctx.stroke();
    }

    // kernel density estimate for smooth curve
    const samples: number[] = [];
    const densities: number[] = [];
    const bandwidth = Math.max(span * 0.06, 8);
    const invBandwidth = 1 / (bandwidth * Math.sqrt(2 * Math.PI));

    for (let i = 0; i < SAMPLE_COUNT; i++) {
      const x = min + (span * i) / (SAMPLE_COUNT - 1);
      samples.push(x);
      let sum = 0;
      for (let j = 0; j < mem.length; j++) {
        const z = (x - mem[j]) / bandwidth;
        sum += Math.exp(-0.5 * z * z);
      }
      densities.push(sum * invBandwidth / Math.max(1, mem.length));
    }

    const maxDensity = Math.max(...densities) || 1;

    const X = (value: number) => pad + ((value - min) / span) * innerW;
    const Y = (density: number) => baseY - (density / maxDensity) * innerH;

    const gradient = ctx.createLinearGradient(0, pad, 0, baseY);
    gradient.addColorStop(0, 'rgba(90, 245, 190, 0.6)');
    gradient.addColorStop(1, 'rgba(90, 245, 190, 0.05)');

    ctx.beginPath();
    ctx.moveTo(X(samples[0]), baseY);
    densities.forEach((d, i) => {
      ctx.lineTo(X(samples[i]), Y(d));
    });
    ctx.lineTo(X(samples[samples.length - 1]), baseY);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.lineWidth = 2 * dpr;
    ctx.strokeStyle = 'rgba(120, 255, 210, 0.9)';
    ctx.beginPath();
    densities.forEach((d, i) => {
      const x = X(samples[i]);
      const y = Y(d);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // sample scatter to show recency
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    const scatter = recent.slice(-120);
    scatter.forEach((d, idx) => {
      if (!Number.isFinite(d.heapMB)) return;
      const x = X(d.heapMB);
      const alpha = 0.1 + idx / scatter.length * 0.35;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillRect(x - 1, baseY - 6 * dpr, 2, 4 * dpr);
    });

    // stats overlays
    const avg = mem.reduce((sum, v) => sum + v, 0) / mem.length;
    const sorted = [...mem].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)];

    const drawStatLine = (value: number, color: string, label: string, offset: number) => {
      const x = X(value);
      ctx.setLineDash([4 * dpr, 4 * dpr]);
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(x, pad);
      ctx.lineTo(x, baseY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = color;
      ctx.font = `${13*dpr}px ui-sans-serif, system-ui`;
      ctx.fillText(label, x + 6 * dpr, pad + offset * dpr);
    };

    drawStatLine(avg, 'rgba(255,255,255,0.7)', `avg ${avg.toFixed(0)} MB`, 14);
    drawStatLine(p95, 'rgba(255,120,150,0.9)', `95th ${p95.toFixed(0)} MB`, 30);

    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = `${12*dpr}px ui-sans-serif, system-ui`;
    ctx.fillText(`${min.toFixed(0)} MB`, pad, baseY + 14 * dpr);
    const maxLabel = `${max.toFixed(0)} MB`;
    ctx.fillText(maxLabel, pad + innerW - ctx.measureText(maxLabel).width, baseY + 14 * dpr);
  }, [derived.series]);

  return <canvas ref={el} style={{width:'100%', height: 260}} />;
}
