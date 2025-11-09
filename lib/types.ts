// lib/types.ts
export type Category = 'alpha' | 'beta' | 'gamma';
export type CategoryFilter = Category | 'all';

export interface DataPoint {
  timestamp: number;
  value: number;
  category: Category;
  // optional network metrics (MB/s)
  netInMBps?: number;
  netOutMBps?: number;
  // optional memory metric (MB)
  heapMB?: number;
  // optional process CPU % (0-100)
  proc?: number;
  // optional frames-per-second metric
  fps?: number;
  // optional render time in ms
  renderMs?: number;
  // optional anomaly flag
  anomaly?: boolean;
}
export interface AggPoint   { timestamp: number; value: number; }

export type TimeBucket = '1m' | '5m' | '1h';
export interface DashboardFilter {
  category: CategoryFilter;
  // optional UI filters
  fpsMin?: number;
  renderMaxMs?: number;
  procMaxPct?: number;
  memMinMB?: number;
  memMaxMB?: number;
  anomaliesOnly?: boolean;
}
export interface ZoomRange { xMin: number | null; xMax: number | null; }

export interface DashboardDerived { aggregated: AggPoint[]; series: DataPoint[]; }
export interface DashboardStoreState { raw: DataPoint[]; bucket: TimeBucket; filter: DashboardFilter; zoom: ZoomRange; }
export interface DashboardState extends DashboardStoreState { derived: DashboardDerived; }

export type DashboardAction =
  | { type: 'SET_TIME_BUCKET'; bucket: TimeBucket }
  | { type: 'SET_FILTER'; filter: DashboardFilter }
  | { type: 'SET_ZOOM'; zoom: ZoomRange }
  | { type: 'PUSH_POINTS'; points: DataPoint[] };

export interface Viewport { x: number; y: number; w: number; h: number; }
export interface Scale    { x: (value: number) => number; y: (value: number) => number; }

/* --------- Alert Rules ---------- */
// include equality comparators so runtime evaluators that support 'eq'/'neq' match the Rule type
export type Comparator = 'lt' | 'gt' | 'lte' | 'gte' | 'outside' | 'inside' | 'eq' | 'neq';

export interface Rule {
  id: string;
  metric: 'fps' | 'memory';         // memory = MB; fps = unit-less
  comparator: Comparator;
  threshold: number | [number, number];
  forSec: number;
  enabled: boolean;
  notify: { type: 'slack' | 'toast' | 'console'; level?: 'INFO' | 'WARN' | 'CRIT' };
  label?: string;
}

/* --------- Fired Alerts ---------- */
export interface AlertEvent {
  id: string;
  ts: number;
  level: 'INFO' | 'WARN' | 'CRIT';
  message: string;
  ruleId?: string;
  metric?: Rule['metric'];
}
