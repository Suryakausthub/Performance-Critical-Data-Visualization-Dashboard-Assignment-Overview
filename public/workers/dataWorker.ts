import type { DataPoint } from '../../lib/types';
import { synthesizeBatch } from '../../lib/dataGenerator';

// Note: Compiled as module worker via new URL(..., import.meta.url)
let timer: number | null = null;
let lastPoint: DataPoint | undefined;

const ctx: DedicatedWorkerGlobalScope = self as DedicatedWorkerGlobalScope;

ctx.onmessage = (e: MessageEvent) => {
  const { type, intervalMs = 100, batchSize = 12 } = e.data as {
    type: string;
    intervalMs?: number;
    batchSize?: number;
  };

  if (type === 'start') {
    if (timer) clearInterval(timer);
    lastPoint = undefined;
    timer = setInterval(() => {
      const { points, last } = synthesizeBatch(
        batchSize,
        Date.now(),
        1,
        lastPoint,
      );
      lastPoint = last;
      ctx.postMessage(points);
    }, intervalMs) as unknown as number;
  } else if (type === 'stop') {
    if (timer) clearInterval(timer);
    timer = null;
    lastPoint = undefined;
  }
};
