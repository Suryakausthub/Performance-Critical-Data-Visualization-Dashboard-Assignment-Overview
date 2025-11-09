'use client';
import { useDashboard, useDashboardDispatch } from '@/components/providers/DataProvider';

export default function TimeRangeSelector() {
  const { bucket } = useDashboard();
  const dispatch = useDashboardDispatch();

  return (
    <>
      <div className="kpi-caption">Aggregate</div>
      <select
        className="select"
        value={bucket}
        onChange={(e) => dispatch({ type: 'SET_TIME_BUCKET', bucket: e.target.value as any })}
        aria-label="Aggregation bucket"
      >
        <option value="1m">1 min</option>
        <option value="5m">5 min</option>
        <option value="1h">1 hour</option>
      </select>

      <button
        className="btn btn-ghost"
        onClick={() => dispatch({ type: 'SET_ZOOM', zoom: { xMin: null, xMax: null } })}
        aria-label="Reset zoom"
      >
        Reset Zoom
      </button>

      <span className="btn btn-ghost" aria-hidden>▤ Filter</span>
    </>
  );
}
