// hooks/useRuleEngine.ts
'use client';

import { useEffect, useRef, useState } from 'react';
import type { Rule } from '@/lib/types';

const STORAGE_KEY = 'rules.v1';

/* persistence */
function loadRules(): Rule[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}
function saveRules(rules: Rule[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(rules)); } catch {}
}

/* comparators */
function cmp(val: number, c: Rule['comparator'], thr: Rule['threshold']) {
  if (val == null || Number.isNaN(val)) return false;
  if (Array.isArray(thr)) {
    const [a, b] = thr;
    const lo = Math.min(a, b), hi = Math.max(a, b);
    if (c === 'inside')  return val >= lo && val <= hi;
    if (c === 'outside') return val <  lo || val >  hi;
    return false;
  }
  if (c === 'lt')  return val <  thr;
  if (c === 'lte') return val <= thr;
  if (c === 'gt')  return val >  thr;
  if (c === 'gte') return val >= thr;
  return false;
}

/* engine */
export function useRuleEngine() {
  const [rules, setRules] = useState<Rule[]>([]);
  const ring = useRef<{ ts: number; fps: number; memory: number }[]>([]);
  const lastFireAt = useRef<Record<string, number>>({});

  useEffect(() => { setRules(loadRules()); }, []);
  useEffect(() => {
    saveRules(rules);
    window.dispatchEvent(new CustomEvent('rules:count', { detail: { count: rules.length } }));
  }, [rules]);

  // evaluate on performance samples
  useEffect(() => {
    const onSample = (e: Event) => {
      const d = (e as CustomEvent).detail as { ts: number; metrics: { fps?: number; memory?: number; heapMB?: number } };
      if (!d) return;
      const fps = Number(d.metrics.fps ?? 0);
      const memory = Number(d.metrics.memory ?? d.metrics.heapMB ?? 0);

      ring.current.push({ ts: d.ts, fps, memory });

      const cutoff = Date.now() - 120_000;
      while (ring.current.length && ring.current[0].ts < cutoff) ring.current.shift();

      for (const r of rules) {
        if (!r.enabled) continue;
        const since = Date.now() - r.forSec * 1000;
        const vals = ring.current.filter(x => x.ts >= since).map(x => (r.metric === 'fps' ? x.fps : x.memory));
        if (!vals.length) continue;

        const ok = vals.every(v => cmp(v, r.comparator, r.threshold));
        if (!ok) continue;

        const last = lastFireAt.current[r.id] || 0;
        if (Date.now() - last < 20_000) continue; // debounce
        lastFireAt.current[r.id] = Date.now();

        const msg = `${r.label || r.metric.toUpperCase()} fired: ${r.metric} ${
          Array.isArray(r.threshold) ? `${r.comparator} ${r.threshold[0]}..${r.threshold[1]}` : `${r.comparator} ${r.threshold}`
        } for ${r.forSec}s`;

        // notify feed + optional webhook
        window.dispatchEvent(new CustomEvent('rules:trigger', { detail: { level: r.notify.level || 'INFO', rule: r, message: msg } }));
        if (r.notify.type === 'slack') {
          fetch('/api/notify/slack', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ text: msg, level: r.notify.level || 'WARN', extra: { recent: vals.slice(-5) } }),
          }).catch(()=>{});
        } else {
          // eslint-disable-next-line no-console
          console.warn('[RuleEngine]', msg);
        }
      }
    };

    window.addEventListener('perf:sample', onSample as EventListener);
    return () => window.removeEventListener('perf:sample', onSample as EventListener);
  }, [rules]);

  // auto-CRIT for unhandled errors
  useEffect(() => {
    const sendCrit = (text: string) => {
      window.dispatchEvent(new CustomEvent('rules:trigger', { detail: { level: 'CRIT', rule: { label: text } } }));
      fetch('/api/notify/slack', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text, level: 'CRIT' }),
      }).catch(()=>{});
    };
    const onErr = (ev: ErrorEvent) => sendCrit(`Unhandled Error: ${ev.message}`);
    const onRej = (ev: PromiseRejectionEvent) => sendCrit(`Unhandled Rejection: ${String(ev.reason)}`);
    window.addEventListener('error', onErr);
    window.addEventListener('unhandledrejection', onRej);
    return () => {
      window.removeEventListener('error', onErr);
      window.removeEventListener('unhandledrejection', onRej);
    };
  }, []);

  return { rules, setRules };
}
