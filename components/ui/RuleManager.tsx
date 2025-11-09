// components/ui/RuleManager.tsx
'use client';

import * as React from 'react';
import type { Rule } from '@/lib/types';

type Template = {
  id: string; label: string; description: string;
  metric: Rule['metric']; comparator: Rule['comparator']; threshold: Rule['threshold'];
  forSec: number; notify: Rule['notify'];
};

const STORE = 'alertrules.v1';

const TEMPLATES: Template[] = [
  { id:'fps-warn', label:'FPS < 45 for 10s (Warn • Slack)', description:'Warn if FPS dips below 45 and stays there for ~10s.', metric:'fps', comparator:'lt', threshold:45, forSec:10, notify:{type:'slack', level:'WARN'} },
  { id:'fps-out',  label:'FPS outside 30–58 for 5s (Crit)',  description:'Critical if FPS moves outside the 30–58 band for ~5s.', metric:'fps', comparator:'outside', threshold:[30,58], forSec:5, notify:{type:'slack', level:'CRIT'} },
  { id:'mem-high', label:'Memory ≥ 1024MB for 5s (Crit)',    description:'Critical sustained memory over 1GB.', metric:'memory', comparator:'gte', threshold:1024, forSec:5, notify:{type:'slack', level:'CRIT'} },
  { id:'mem-ok',   label:'Memory ≤ 512MB for 15s (Info)',    description:'Informational: healthy steady-state memory.', metric:'memory', comparator:'lte', threshold:512, forSec:15, notify:{type:'toast', level:'INFO'} },
];

function load(): Rule[] { try { return JSON.parse(localStorage.getItem(STORE) || '[]'); } catch { return []; } }
function save(rules: Rule[]) {
  try { localStorage.setItem(STORE, JSON.stringify(rules)); } catch {}
  const active = rules.filter(r => r.enabled).length;
  window.dispatchEvent(new CustomEvent('rules:count', { detail: { count: active } }));
}

function sig(r: Pick<Rule,'metric'|'comparator'|'threshold'|'forSec'|'notify'>) {
  const thr = Array.isArray(r.threshold) ? `${r.threshold[0]}..${r.threshold[1]}` : String(r.threshold);
  return `${r.metric}|${r.comparator}|${thr}|${r.forSec}|${r.notify?.type||''}|${r.notify?.level||''}`;
}
function cmpSym(c: Rule['comparator']) {
  switch (c) { case 'lt': return '<'; case 'lte': return '≤'; case 'gt': return '>'; case 'gte': return '≥'; case 'inside': return 'inside'; case 'outside': return 'outside'; case 'eq': return '=='; case 'neq': return '!='; default: return String(c); }
}
function fmtThr(t: Rule['threshold'], metric: Rule['metric']) {
  const suf = metric === 'memory' ? 'MB' : '';
  return Array.isArray(t) ? `${t[0]}${suf}..${t[1]}${suf}` : `${t}${suf}`;
}
function buildLabel(t: Template) {
  const suf = t.metric === 'memory' ? 'MB' : '';
  const thr = Array.isArray(t.threshold) ? `${t.threshold[0]}${suf}..${t.threshold[1]}${suf}` : `${t.threshold}${suf}`;
  return `${t.metric.toUpperCase()} ${cmpSym(t.comparator)} ${thr} for ${t.forSec}s`;
}

export default function RuleManagerModal() {
  const [open, setOpen] = React.useState(false);
  const [rules, setRules] = React.useState<Rule[]>([]);
  const [tpl, setTpl] = React.useState<string>(TEMPLATES[0].id);

  React.useEffect(() => { setRules(load()); }, []);
  React.useEffect(() => { save(rules); }, [rules]);

  React.useEffect(() => {
    const onOpen = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'r') setOpen(true);
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('rules:open', onOpen as EventListener);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('rules:open', onOpen as EventListener);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const addFromTemplate = () => {
    const t = TEMPLATES.find(x => x.id === tpl)!;
    const newRule: Rule = { id: crypto.randomUUID(), metric:t.metric, comparator:t.comparator, threshold:t.threshold, forSec:t.forSec, enabled:true, notify:t.notify, label:buildLabel(t) };
    const s = sig(newRule);
    setRules(prev => {
      const i = prev.findIndex(r => sig(r) === s);
      if (i >= 0) { const next = prev.slice(); next[i] = { ...next[i], enabled: true }; return next; }
      return [newRule, ...prev];
    });
  };

  const toggle = (id: string, enabled: boolean) => setRules(prev => prev.map(r => r.id === id ? { ...r, enabled } : r));
  const remove = (id: string) => setRules(prev => prev.filter(r => r.id !== id));
  const clear  = () => setRules([]);

  // Guaranteed-hit Quick Demo: synthesize a window that satisfies every enabled rule
  const quickCheckDemo = () => {
    const now = Date.now();
    const mk = (vals: number[], stepMs = 1000) =>
      vals.map((v, i) => ({ t: now - (vals.length - 1 - i) * stepMs, v }));

    const snapshot: Record<string, {t:number; v:number}[]> = {};
    for (const r of rules.filter(x => x.enabled)) {
      const L = Math.max(12, r.forSec + 2);
      let series: number[] = new Array(L).fill(
        typeof r.threshold === 'number' ? Number(r.threshold) : (r.comparator === 'inside' ? (r.threshold as [number,number])[0] : (r.threshold as [number,number])[1])
      );

      const bump = (v:number, by:number)=>v+by, drop=(v:number,by:number)=>v-by, mid=(a:number,b:number)=>Math.floor((a+b)/2);

      if (typeof r.threshold === 'number') {
        if (r.comparator === 'lt' || r.comparator === 'lte') series = series.map((v,i)=> i>=L-r.forSec-1 ? drop(v,5) : v);
        else if (r.comparator === 'gt' || r.comparator === 'gte') series = series.map((v,i)=> i>=L-r.forSec-1 ? bump(v,5) : v);
        else if (r.comparator === 'eq')  series = series.map((v,i)=> i>=L-r.forSec-1 ? r.threshold : v);
        else if (r.comparator === 'neq') series = series.map((v,i)=> i>=L-r.forSec-1 ? r.threshold + 1 : v);
      } else {
        const [a,b] = r.threshold as [number,number];
        if (r.comparator === 'inside')  series = series.map((_,i)=> i>=L-r.forSec-1 ? mid(a,b) : (a-5));
        if (r.comparator === 'outside') series = series.map((_,i)=> i>=L-r.forSec-1 ? (b+5) : mid(a,b));
      }
      snapshot[r.metric] = mk(series);
    }

    let fired = 0;
    for (const r of rules.filter(x => x.enabled)) {
      const pts = snapshot[r.metric] || [];
      const last = pts[pts.length-1]?.t ?? now;
      const floor = last - r.forSec*1000;
      const ok = pts.filter(p => p.t >= floor).every(p => {
        const v = p.v, thr = r.threshold;
        switch (r.comparator) {
          case 'lt':  return v <  (thr as number);
          case 'lte': return v <= (thr as number);
          case 'gt':  return v >  (thr as number);
          case 'gte': return v >= (thr as number);
          case 'eq':  return v === (thr as number);
          case 'neq': return v !== (thr as number);
          case 'inside':  { const [a,b]=thr as [number,number]; return v >= Math.min(a,b) && v <= Math.max(a,b); }
          case 'outside': { const [a,b]=thr as [number,number]; return v <  Math.min(a,b) ||  v >  Math.max(a,b); }
          default: return false;
        }
      });
      if (ok) {
        fired++;
        const label = r.label || `${String(r.metric).toUpperCase()} ${cmpSym(r.comparator)} ${fmtThr(r.threshold, r.metric)} for ${r.forSec}s`;
        const message = `${r.metric} ${cmpSym(r.comparator)} ${fmtThr(r.threshold, r.metric)} for ${r.forSec}s`;
        window.dispatchEvent(new CustomEvent('rules:trigger', { detail: { level: r.notify?.level || 'INFO', rule: { label, metric: r.metric, comparator: r.comparator, threshold: r.threshold, forSec: r.forSec }, message } }));
      }
    }
    if (!fired) alert('No enabled rules matched the demo snapshot.');
  };

  const selected = TEMPLATES.find(x => x.id === tpl)!;

  if (!open) return null;

  return (
    <div
      role="dialog" aria-modal="true" aria-label="Alert Rules"
      onMouseDown={() => setOpen(false)}                                     // backdrop close
      style={{ position:'fixed', inset:0, zIndex:60, background:'rgba(10,15,28,.55)', backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)', display:'grid', placeItems:'center' }}
    >
      <div
        className="card"
        onMouseDown={e => e.stopPropagation()}                               // prevent backdrop close
        style={{ width:760, maxWidth:'92vw', padding:18, borderRadius:16 }}
      >
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
          <div className="card-title">Alert Rules</div>
          <button type="button" className="btn btn-ghost" onClick={(e)=>{e.stopPropagation(); setOpen(false);}} aria-label="Close">Close</button>
        </div>

        <div className="toolbar" style={{ gap:8, marginBottom:6, flexWrap:'wrap' }}>
          <select aria-label="Rule template" value={tpl} onChange={e => setTpl(e.target.value)}>
            {TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <button className="btn btn-primary" onClick={addFromTemplate}>Add rule</button>
          <button className="btn" onClick={quickCheckDemo}>Quick Check (demo)</button>
          <button className="btn btn-ghost" onClick={clear}>Clear</button>
        </div>

        <div className="subtle" style={{marginBottom:10}}>{selected.description}</div>

        <div className="data-table" style={{ maxHeight:420 }}>
          <table>
            <thead><tr><th>On</th><th>Label</th><th>Metric</th><th>Cmp</th><th>Threshold</th><th>For(s)</th><th>Notify</th><th></th></tr></thead>
            <tbody>
              {rules.map(r => (
                <tr key={r.id}>
                  <td><input type="checkbox" checked={r.enabled} onChange={e => toggle(r.id, e.target.checked)} aria-label={`Enable ${r.label ?? r.id.slice(0,6)}`} /></td>
                  <td>{r.label ?? <code>{r.id.slice(0,6)}</code>}</td>
                  <td>{r.metric}</td>
                  <td>{cmpSym(r.comparator)}</td>
                  <td>{fmtThr(r.threshold, r.metric)}</td>
                  <td>{r.forSec}</td>
                  <td>{r.notify.type}{r.notify.level ? ` • ${r.notify.level}` : ''}</td>
                  <td><button className="btn btn-ghost" onClick={() => remove(r.id)}>Delete</button></td>
                </tr>
              ))}
              {!rules.length && <tr><td colSpan={8} className="subtle">No rules yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
