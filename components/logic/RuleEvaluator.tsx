'use client';

import * as React from 'react';
import type { Rule } from '@/lib/types';

type Comparator =
  | 'lt'
  | 'lte'
  | 'gt'
  | 'gte'
  | 'eq'
  | 'neq'
  | 'inside'
  | 'outside';

const STORE = 'alertrules.v1';

type Point = { t: number; v: number };
type Buffers = Map<string, Point[]>; // metric -> points

function loadRules(): Rule[] {
  try {
    return JSON.parse(localStorage.getItem(STORE) || '[]');
  } catch {
    return [];
  }
}

function keepLastNSeconds(buf: Point[], seconds: number) {
  const floor = Date.now() - seconds * 1000;
  let i = 0;
  while (i < buf.length && buf[i].t < floor) i++;
  return i > 0 ? buf.slice(i) : buf;
}

function holds(v: number, thr: Rule['threshold'], c: Rule['comparator']) {
  switch (c as Comparator) {
    case 'lt':
      return v < (thr as number);
    case 'lte':
      return v <= (thr as number);
    case 'gt':
      return v > (thr as number);
    case 'gte':
      return v >= (thr as number);
    case 'eq':
      return v === (thr as number);
    case 'neq':
      return v !== (thr as number);
    case 'inside': {
      const [a, b] = thr as [number, number];
      return v >= Math.min(a, b) && v <= Math.max(a, b);
    }
    case 'outside': {
      const [a, b] = thr as [number, number];
      return v < Math.min(a, b) || v > Math.max(a, b);
    }
    default:
      return false;
  }
}

export default function RuleEvaluator() {
  const buffers = React.useRef<Buffers>(new Map());
  const lastFired = React.useRef<Record<string, number>>({}); // sig -> ts (debounce)

  // Accept single points and snapshots
  React.useEffect(() => {
    const onPoint = (e: Event) => {
      const { metric, v, t } = (e as CustomEvent).detail || {};
      if (!metric) return;
      const arr = buffers.current.get(metric) ?? [];
      arr.push({ t: t ?? Date.now(), v: Number(v) });
      buffers.current.set(metric, keepLastNSeconds(arr, 120));
    };
    const onSnap = (e: Event) => {
      const { metric, points } = (e as CustomEvent).detail || {};
      if (!metric || !Array.isArray(points)) return;
      const arr = (points as Point[]).map((p) => ({
        t: Number(p.t),
        v: Number(p.v),
      }));
      buffers.current.set(metric, keepLastNSeconds(arr, 120));
    };
    window.addEventListener('metrics:point', onPoint as EventListener);
    window.addEventListener('metrics:snapshot', onSnap as EventListener);
    return () => {
      window.removeEventListener('metrics:point', onPoint as EventListener);
      window.removeEventListener('metrics:snapshot', onSnap as EventListener);
    };
  }, []);

  // Evaluate every 1s against recent window
  React.useEffect(() => {
    const iv = setInterval(() => {
      const rules = loadRules().filter((r) => r.enabled);
      if (!rules.length) return;

      const now = Date.now();
      for (const r of rules) {
        const pts = buffers.current.get(r.metric) || [];
        if (!pts.length) continue;
        const floor = now - r.forSec * 1000;
        const windowPts = pts.filter((p) => p.t >= floor);
        if (!windowPts.length) continue;
        const ok = windowPts.every((p) => holds(p.v, r.threshold, r.comparator));
        if (!ok) continue;

        const key = `${r.metric}|${r.comparator}|${JSON.stringify(
          r.threshold
        )}|${r.forSec}`;
        if ((lastFired.current[key] ?? 0) > now - 3000) continue; // debounce 3s
        lastFired.current[key] = now;

        const label = r.label || `${r.metric.toUpperCase()} rule`;
        const message =
          typeof r.threshold === 'number'
            ? `${r.metric} ${r.comparator} ${r.threshold} for ${r.forSec}s`
            : `${r.metric} ${r.comparator} ${(r.threshold as [number, number]).join(
                '..'
              )} for ${r.forSec}s`;

        // Let AlertCenter & buttons react
        window.dispatchEvent(
          new CustomEvent('rules:trigger', {
            detail: {
              level: r.notify?.level || 'INFO',
              rule: {
                label,
                metric: r.metric,
                comparator: r.comparator,
                threshold: r.threshold,
                forSec: r.forSec,
              },
              message,
            },
          })
        );
      }
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  return null;
}
