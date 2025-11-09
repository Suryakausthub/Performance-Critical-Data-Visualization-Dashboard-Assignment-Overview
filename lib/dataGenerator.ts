import { AggPoint, Category, DataPoint, TimeBucket } from './types';

const CATEGORIES: Category[] = ['alpha', 'beta', 'gamma'];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const jitter = (value: number, delta: number) =>
  value + (Math.random() - 0.5) * 2 * delta;

const pickCategory = (prev?: Category) => {
  if (prev && Math.random() < 0.55) return prev;
  return CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
};

export function synthesizePoint(timestamp: number, prev?: DataPoint): DataPoint {
  const fpsBase = 72 + Math.sin(timestamp / 1800) * 12;
  const fps = clamp(jitter(fpsBase, 6), 24, 144);

  const renderMs = clamp(jitter(1000 / Math.max(fps, 1), 0.8), 1.8, 22);
  const proc = clamp(jitter(30 + (110 - fps) * 0.35, 10), 5, 99);

  const heapBase = (prev?.heapMB ?? 320) + Math.sin(timestamp / 4000) * 24;
  const heapMB = clamp(jitter(heapBase + (proc - 55) * 0.4, 8), 180, 2048);

  const netIn = clamp(
    jitter((prev?.netInMBps ?? 28) + Math.cos(timestamp / 4800) * 8, 4),
    0,
    80,
  );
  const netOut = clamp(
    jitter((prev?.netOutMBps ?? 18) + Math.sin(timestamp / 3600) * 6, 3),
    0,
    64,
  );

  const anomaly = renderMs > 18 || proc > 85 || heapMB > 1700;

  return {
    timestamp,
    category: pickCategory(prev?.category),
    value: fps,
    fps: Number(fps.toFixed(1)),
    renderMs: Number(renderMs.toFixed(2)),
    proc: Number(proc.toFixed(1)),
    heapMB: Number(heapMB.toFixed(1)),
    netInMBps: Number(netIn.toFixed(2)),
    netOutMBps: Number(netOut.toFixed(2)),
    anomaly,
  };
}

export function synthesizeBatch(
  count: number,
  startTs: number,
  stepMs: number,
  prev?: DataPoint,
) {
  const points = new Array<DataPoint>(count);
  let last = prev;

  for (let i = 0; i < count; i++) {
    const ts = startTs + i * stepMs;
    last = synthesizePoint(ts, last);
    points[i] = last;
  }

  return { points, last };
}

export function generateInitialDataset(n: number): DataPoint[] {
  const now = Date.now();
  const start = now - n * 100; // 100ms step
  return synthesizeBatch(n, start, 100).points;
}

export function aggregateSeries(series: DataPoint[] | undefined, bucket: TimeBucket): AggPoint[] {
  if (!series || series.length === 0) return [];
  const step = bucket === '1m' ? 60_000 : bucket === '5m' ? 300_000 : 3_600_000;
  const map = new Map<number, { sum: number; n: number }>();
  for (const d of series) {
    const t = Math.floor(d.timestamp / step) * step;
    const cur = map.get(t) ?? { sum: 0, n: 0 };
    cur.sum += d.value; cur.n += 1;
    map.set(t, cur);
  }
  return Array.from(map, ([timestamp, { sum, n }]) => ({ timestamp, value: sum / n }));
}
