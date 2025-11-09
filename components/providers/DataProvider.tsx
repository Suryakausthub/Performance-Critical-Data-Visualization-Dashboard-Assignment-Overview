// components/providers/DataProvider.tsx
'use client';

import React, {
  createContext, useContext, useMemo, useReducer, useEffect,
} from 'react';
import type {
  DataPoint, DashboardState, DashboardStoreState, DashboardAction, TimeBucket,
} from '@/lib/types';
import { useDataStream } from '@/hooks/useDataStream';
import { aggregateSeries } from '@/lib/dataGenerator';

const StateCtx = createContext<DashboardState | null>(null);
const DispatchCtx = createContext<
  React.Dispatch<
    | DashboardAction
    | { type: 'MERGE_FILTER'; patch: Partial<DashboardStoreState['filter']> }
  >
|null>(null);

type FilterPatch = Partial<DashboardStoreState['filter']>;

function reducer(
  state: DashboardStoreState,
  action: DashboardAction | { type: 'MERGE_FILTER'; patch: FilterPatch }
): DashboardStoreState {
  switch (action.type) {
    case 'SET_TIME_BUCKET':
      return { ...state, bucket: action.bucket };
    case 'SET_FILTER':
      return { ...state, filter: action.filter };
    case 'MERGE_FILTER':
      return { ...state, filter: { ...state.filter, ...action.patch } };
    case 'SET_ZOOM':
      return { ...state, zoom: action.zoom };
    case 'PUSH_POINTS': {
      const max = 100000;
      const merged = [...state.raw, ...action.points];
      const trimmed = merged.length > max ? merged.slice(merged.length - max) : merged;
      return { ...state, raw: trimmed };
    }
    default:
      return state;
  }
}

// ————— normalization —————
// Map whatever your generator streams into canonical keys used everywhere.
function normalize(d: any) {
  const t = Number(d.timestamp ?? d.t ?? Date.now());

  // fps: value | fps | framesPerSec | frameRate
  const fps =
    n(d.fps) ?? n(d.value) ?? n(d.framesPerSec) ?? n(d.frameRate) ?? null;

  // render time in ms: renderMs | render | frameMs | frameTime
  const renderMs =
    n(d.renderMs) ?? n(d.render) ?? n(d.frameMs) ?? n(d.frameTime) ?? null;

  // heap in MB: heapMB | memoryMB | heap | memory (bytes -> MB if > 4096)
  let heapMB =
    n(d.heapMB) ?? n(d.memoryMB) ?? n(d.heap) ?? n(d.memory) ?? null;
  if (heapMB != null && heapMB > 4096 && !String(d.heapMB ?? d.memoryMB)) {
    // likely bytes; convert
    heapMB = heapMB / (1024 * 1024);
  }

  // proc in %: proc | cpu | cpuPct
  const proc =
    n(d.proc) ?? n(d.cpu) ?? n(d.cpuPct) ?? null;

  return {
    ...d,
    timestamp: t,
    fps,
    renderMs,
    heapMB,
    proc,
  };
}

function n(x: unknown) {
  const v = Number(x);
  return Number.isFinite(v) ? v : null;
}

export default function DataProvider({
  initialData,
  children,
}: { initialData: DataPoint[]; children: React.ReactNode }) {
  const [state, dispatch] = useReducer(
    reducer,
    {
      raw: initialData,
      bucket: '1m',
      filter: {
        category: 'all',
        fpsMin: 0,
        renderMaxMs: 10_000,
        procMaxPct: 100,
        memMinMB: 0,
        memMaxMB: 1_000_000,
        anomaliesOnly: false,
      },
      zoom: { xMin: null, xMax: null },
    } satisfies DashboardStoreState
  );

  const startStream = useDataStream({ intervalMs: 100, batchSize: 20 });

  useEffect(() => {
    const stop = startStream((pts) => dispatch({ type: 'PUSH_POINTS', points: pts }));
    return stop;
  }, [startStream]);

  // Bridge drawer <-> provider
  useEffect(() => {
    const onApply = (e: Event) => {
      dispatch({ type: 'MERGE_FILTER', patch: (e as CustomEvent).detail || {} });
    };
    const onReset = (e: Event) => {
      const base = (e as CustomEvent).detail || {};
      dispatch({
        type: 'SET_FILTER',
        filter: {
          category: 'all',
          fpsMin: 0,
          renderMaxMs: 10_000,
          procMaxPct: 100,
          memMinMB: 0,
          memMaxMB: 1_000_000,
          anomaliesOnly: false,
          ...base,
        },
      });
    };
    const onPreset = (e: Event) => {
      const { action, settings } = (e as CustomEvent).detail || {};
      if (action === 'load' && settings) {
        dispatch({ type: 'MERGE_FILTER', patch: settings });
      }
    };
    const onRequest = () => {
      window.dispatchEvent(new CustomEvent('filters:current', { detail: { ...state.filter } }));
    };

    window.addEventListener('filters:apply', onApply as EventListener);
    window.addEventListener('filters:reset', onReset as EventListener);
    window.addEventListener('filters:preset', onPreset as EventListener);
    window.addEventListener('filters:request', onRequest as EventListener);
    return () => {
      window.removeEventListener('filters:apply', onApply as EventListener);
      window.removeEventListener('filters:reset', onReset as EventListener);
      window.removeEventListener('filters:preset', onPreset as EventListener);
      window.removeEventListener('filters:request', onRequest as EventListener);
    };
  }, [state.filter]);

  // Derived = normalize -> zoom -> filter -> aggregate
  const derived = useMemo(() => {
    const bucket = state.bucket as TimeBucket;
    const { xMin, xMax } = state.zoom;
    const f = state.filter;

    let series = state.raw.map(normalize);

    if (f.category && f.category !== 'all') {
      series = series.filter((d) => d.category === f.category);
    }
    if (xMin != null || xMax != null) {
      series = series.filter(
        (d) => (xMin == null || d.timestamp >= xMin) && (xMax == null || d.timestamp <= xMax)
      );
    }

    series = series.filter((d) => {
      if (d.fps != null && d.fps < (f.fpsMin ?? 0)) return false;
      if (d.renderMs != null && d.renderMs > (f.renderMaxMs ?? 1e7)) return false;
      if (d.proc != null && d.proc > (f.procMaxPct ?? 100)) return false;
      if (d.heapMB != null) {
        if (d.heapMB < (f.memMinMB ?? 0)) return false;
        if (d.heapMB > (f.memMaxMB ?? Number.MAX_SAFE_INTEGER)) return false;
      }
      if (f.anomaliesOnly && !d.anomaly) return false;
      return true;
    });

    const aggregated = aggregateSeries(series, bucket);
    return { aggregated, series };
  }, [state.raw, state.bucket, state.filter, state.zoom]);

  // Publish normalized metric snapshots for rules
  useEffect(() => {
    if (!derived.series.length) return;

    const toPts = (key: 'fps' | 'renderMs' | 'proc' | 'heapMB') =>
      derived.series
        .map((d: any) => (Number.isFinite(d[key]) ? { t: d.timestamp, v: Number(d[key]) } : null))
        .filter(Boolean) as { t: number; v: number }[];

    const fpsPts = toPts('fps');
    const renderPts = toPts('renderMs');
    const procPts = toPts('proc');
    const memPts = toPts('heapMB');

    if (fpsPts.length) window.dispatchEvent(new CustomEvent('metrics:snapshot', { detail: { metric: 'fps', points: fpsPts } }));
    if (renderPts.length) window.dispatchEvent(new CustomEvent('metrics:snapshot', { detail: { metric: 'render', points: renderPts } }));
    if (procPts.length) window.dispatchEvent(new CustomEvent('metrics:snapshot', { detail: { metric: 'proc', points: procPts } }));
    if (memPts.length) window.dispatchEvent(new CustomEvent('metrics:snapshot', { detail: { metric: 'memory', points: memPts } }));
  }, [derived.series]);

  const value: DashboardState = { ...state, derived };

  return (
    <StateCtx.Provider value={value}>
      <DispatchCtx.Provider value={dispatch}>{children}</DispatchCtx.Provider>
    </StateCtx.Provider>
  );
}

export function useDashboard(): DashboardState {
  const ctx = useContext(StateCtx);
  if (!ctx) throw new Error('useDashboard must be used within DataProvider');
  return ctx;
}

export function useDashboardDispatch() {
  const ctx = useContext(DispatchCtx);
  if (!ctx) throw new Error('useDashboardDispatch must be used within DataProvider');
  return ctx;
}
