"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDashboard } from "@/components/providers/DataProvider";
import type { DashboardState } from "@/lib/types";

function useDashboardSafe(): DashboardState | null {
  try {
    return useDashboard();
  } catch {
    return null;
  }
}

const SMOOTH = 0.2;

const blend = (prev: number, next?: number | null) => {
  if (next == null || Number.isNaN(next)) return prev;
  return prev * (1 - SMOOTH) + next * SMOOTH;
};

export function usePerformanceMonitor() {
  const dashboard = useDashboardSafe();
  const latest = dashboard?.derived.series.at(-1);

  const [fps, setFps] = useState(60);
  const [renderMs, setRenderMs] = useState(() => latest?.renderMs ?? 0);
  const [procPct, setProcPct] = useState(() => latest?.proc ?? 0);
  const [heapMB, setHeapMB] = useState(() => latest?.heapMB ?? 0);
  const [stress, setStress] = useState(false);

  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number>(performance.now());

  const loop = useCallback(() => {
    const t = performance.now();
    const dt = t - lastRef.current;
    lastRef.current = t;
    setFps((prev) => 0.9 * prev + 0.1 * (1000 / Math.max(dt, 1)));
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [loop]);

  useEffect(() => {
    if (!latest) return;
    setRenderMs((prev) => blend(prev, latest.renderMs));
    setProcPct((prev) => blend(prev, latest.proc));
    setHeapMB((prev) => blend(prev, latest.heapMB));
  }, [latest?.timestamp, latest?.renderMs, latest?.proc, latest?.heapMB]);

  const toggleStress = useCallback(() => setStress((s) => !s), []);

  useEffect(() => {
    if (!stress) return;
    let run = true;
    const work = () => {
      const start = performance.now();
      while (performance.now() - start < 4) {
        Math.sqrt(Math.random() * 1000);
      }
      if (run) setTimeout(work, 0);
    };
    work();
    return () => {
      run = false;
    };
  }, [stress]);

  return { fps, renderMs, procPct, heapMB, stress, toggleStress };
}
