// app/dashboard/ClientDashboard.tsx
'use client';

import type { DataPoint } from '@/lib/types';
import DataProvider from '@/components/providers/DataProvider';
import TimeRangeSelector from '@/components/controls/TimeRangeSelector';
import LineChart from '@/components/charts/LineChart';
import BarChart from '@/components/charts/BarChart';
import ScatterPlot from '@/components/charts/ScatterPlot';
import Heatmap from '@/components/charts/Heatmap';
import DataTable from '@/components/ui/DataTable';
import PerformanceMonitor from '@/components/ui/PerformanceMonitor';
import SnapshotButton from '@/components/ui/SnapshotButton';
import AlertsButton from '@/components/ui/AlertsButton';
import RulesButton from '@/components/ui/RulesButton';
import AlertCenter from '@/components/ui/AlertCenter';
import RuleManagerModal from '@/components/ui/RuleManager';
import RuleEvaluator from '@/components/logic/RuleEvaluator';
import LogControls from '@/components/ui/LogControls';
import FilterButton from '@/components/controls/FilterButton';
import FilterDrawer from '@/components/controls/FilterDrawer';
import FilterDebug from '@/components/ui/FilterDebug';

import ClientExtras from './ClientExtras';

export default function ClientDashboard({ initialData }: { initialData: DataPoint[] }) {
  return (
    <DataProvider initialData={initialData}>
      <div className="container">
        <header className="header">
          <div>
            <h1 className="h1">Real-Time Performance</h1>
            <div className="subtle">v1 • Canvas-first</div>
          </div>
        </header>

        {/* Controls */}
        <section className="card mb12">
          <div className="toolbar">
            {/* Filter drawer trigger */}
            <FilterButton />
            <TimeRangeSelector />
            <PerformanceMonitor variant="toolbar" />
            <AlertsButton />
            <RulesButton />
            {/* Live chip to verify active filters & pass counts */}
            <FilterDebug />
          </div>
        </section>

        {/* Charts */}
        <section className="grid grid-2">
          <article className="card">
            <div
              className="card-title"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span>CPU Usage Over Time</span>
              <SnapshotButton title="Save PNG" />
            </div>
            <div className="card-sub">Last 60 seconds</div>
            <LineChart />
          </article>

          <article className="card">
            <div
              className="card-title"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span>Memory Distribution</span>
              <SnapshotButton title="Save PNG" />
            </div>
            <div className="card-sub">Active processes</div>
            <Heatmap />
          </article>

          <article className="card">
            <div
              className="card-title"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span>Network I/O</span>
              <SnapshotButton title="Save PNG" />
            </div>
            <div className="card-sub">Upload vs. Download</div>
            <BarChart />
          </article>

          <article className="card">
            <div
              className="card-title"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span>Frame Rate (FPS)</span>
              <SnapshotButton title="Save PNG" />
            </div>
            <div className="card-sub">Real-time rendering performance</div>
            <ScatterPlot />
          </article>
        </section>

        {/* Live table */}
        <section className="card mt8">
          <div className="card-title">Live Event Log</div>
          <LogControls containerId="live-log" />
          <div id="live-log" className="data-table" style={{ maxHeight: 360 }}>
            <DataTable />
          </div>
        </section>

        {/* globals */}
        <ClientExtras />

        {/* evaluators & modals */}
        <RuleEvaluator />
        <AlertCenter />
        <RuleManagerModal />
        <FilterDrawer /> {/* mounted once */}
      </div>
    </DataProvider>
  );
}
