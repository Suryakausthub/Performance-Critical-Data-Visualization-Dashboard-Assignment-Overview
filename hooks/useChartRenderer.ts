'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Scale, Viewport } from '@/lib/types';

type ZoomUpdate = { xMin?: number | null; xMax?: number | null };

interface UseChartRendererArgs {
  points: { x: number; y: number }[];
  draw: (ctx: CanvasRenderingContext2D, scale: Scale, vp: Viewport) => void;
  onZoom?: (vp: ZoomUpdate) => void;
}

export function useChartRenderer({ points, draw, onZoom }: UseChartRendererArgs) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const parentRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const extent = useMemo(() => {
    if (points.length === 0) return { xMin: 0, xMax: 1, yMin: 0, yMax: 1 };
    let xMin = points[0].x, xMax = points[0].x, yMin = points[0].y, yMax = points[0].y;
    for (let i = 1; i < points.length; i++) {
      const p = points[i];
      if (p.x < xMin) xMin = p.x;
      if (p.x > xMax) xMax = p.x;
      if (p.y < yMin) yMin = p.y;
      if (p.y > yMax) yMax = p.y;
    }
    if (xMin === xMax) xMax = xMin + 1;
    if (yMin === yMax) yMax = yMin + 1;
    return { xMin, xMax, yMin, yMax };
  }, [points]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = globalThis.devicePixelRatio || 1;
    const w = canvas.clientWidth || 600;
    const h = canvas.clientHeight || 280;
    const tw = Math.floor(w * dpr);
    const th = Math.floor(h * dpr);
    if (canvas.width !== tw || canvas.height !== th) {
      canvas.width = tw;
      canvas.height = th;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const pad = { l: 40, r: 8, t: 8, b: 24 };
    const vp: Viewport = { x: pad.l, y: pad.t, w: w - pad.l - pad.r, h: h - pad.t - pad.b };

    const scale: Scale = {
      x: (x: number) => vp.x + ((x - extent.xMin) / (extent.xMax - extent.xMin)) * vp.w,
      y: (y: number) => vp.y + vp.h - ((y - extent.yMin) / (extent.yMax - extent.yMin)) * vp.h,
    };

    ctx.clearRect(0, 0, w, h);
    performance.mark('render-start');
    draw(ctx, scale, vp);
    performance.mark('render-end');
    performance.measure('render', 'render-start', 'render-end');

    rafRef.current = requestAnimationFrame(render);
  }, [extent, draw]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(render);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [render]);

  useEffect(() => {
    const el = parentRef.current;
    if (!el || !onZoom) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const t = Math.max(0, Math.min(1, px / rect.width));
      const range = extent.xMax - extent.xMin;
      const delta = Math.sign(e.deltaY) * range * 0.1;
      const xMid = extent.xMin + t * range;
      const newRange = Math.max(1, range - delta);
      const xMin = xMid - newRange * t;
      const xMax = xMid + newRange * (1 - t);
      onZoom({ xMin, xMax });
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel as any);
  }, [extent, onZoom]);

  return { canvasRef, parentRef, extent };
}
