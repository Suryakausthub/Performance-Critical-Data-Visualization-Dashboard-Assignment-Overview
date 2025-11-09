import { headers } from 'next/headers';
import type { DataPoint } from '@/lib/types';
import ClientDashboard from './ClientDashboard';

async function getInitialData(): Promise<DataPoint[]> {
  const h = headers();
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host  = h.get('x-forwarded-host') ?? h.get('host');
  const base  = process.env.NEXT_PUBLIC_BASE_URL || (host ? `${proto}://${host}` : 'http://localhost:3000');
  const url   = new URL('/api/data', base).toString();

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch initial data');
  return res.json();
}

export default async function DashboardPage() {
  const initialData = await getInitialData();
  return <ClientDashboard initialData={initialData} />;
}
