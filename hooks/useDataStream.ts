"use client";

import { useCallback, useEffect, useRef } from "react";
import { DataPoint } from "@/lib/types";
import { synthesizeBatch } from "@/lib/dataGenerator";

export function useDataStream({
  intervalMs,
  batchSize,
}: {
  intervalMs: number;
  batchSize: number;
}) {
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    try {
      workerRef.current = new Worker(
        new URL("../public/workers/dataWorker.ts", import.meta.url),
        { type: "module" },
      );
    } catch {
      workerRef.current = null; // some bundlers may not like the path; we fallback
    }
    return () => workerRef.current?.terminate();
  }, []);

  return useCallback(
    (onBatch: (pts: DataPoint[]) => void) => {
      let stopped = false;
      let lastPoint: DataPoint | undefined;

      if (workerRef.current) {
        const w = workerRef.current;
        const handler = (e: MessageEvent) => {
          if (stopped) return;
          const pts = e.data as DataPoint[];
          if (pts.length) lastPoint = pts[pts.length - 1];
          onBatch(pts);
        };
        w.addEventListener("message", handler);
        w.postMessage({ type: "start", intervalMs, batchSize });
        return () => {
          stopped = true;
          w.postMessage({ type: "stop" });
          w.removeEventListener("message", handler);
        };
      }

      // Fallback without worker
      const tick = () => {
        if (stopped) return;
        const { points, last } = synthesizeBatch(
          batchSize,
          Date.now(),
          1,
          lastPoint,
        );
        lastPoint = last;
        onBatch(points);
      };

      const id = setInterval(tick, intervalMs);
      return () => {
        stopped = true;
        clearInterval(id);
      };
    },
    [intervalMs, batchSize],
  );
}
