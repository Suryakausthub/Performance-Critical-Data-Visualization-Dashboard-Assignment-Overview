import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const text = body?.text ?? 'alert';
  const level = body?.level ?? 'INFO';
  const webhook = process.env.SLACK_WEBHOOK_URL;

  if (!webhook) {
    console.warn('[notify/slack]', level, text); // fallback
    return NextResponse.json({ ok: true, dryRun: true });
  }

  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: `*${level}* — ${text}` }),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Slack notify failed', e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
