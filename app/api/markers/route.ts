// app/api/markers/route.ts
import { NextResponse } from 'next/server';

type Marker = { id: string; ts: number; label: string; color?: string };

const store: { markers: Marker[] } = globalThis.__MARKERS__ ?? { markers: [] };
if (!(globalThis as any).__MARKERS__) (globalThis as any).__MARKERS__ = store;

export async function GET() {
  return NextResponse.json(store.markers.sort((a,b) => a.ts - b.ts));
}

export async function POST(req: Request) {
  const { ts = Date.now(), label, color } = await req.json();
  if (!label) return NextResponse.json({ error: 'label required' }, { status: 400 });
  const m: Marker = { id: crypto.randomUUID(), ts, label, color };
  store.markers.push(m);
  // let the app know
  globalThis.dispatchEvent?.(new Event('markers:update'));
  return NextResponse.json(m);
}
