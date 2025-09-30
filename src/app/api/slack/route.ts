import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { text, blocks } = await req.json();
    const webhook = process.env.SLACK_WEBHOOK_URL;
    if (!webhook) {
      return NextResponse.json({ success: false, error: 'SLACK_WEBHOOK_URL not configured' }, { status: 400 });
    }

    const payload: any = { text };
    if (blocks) payload.blocks = blocks;

    const r = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const body = await r.text();
      return NextResponse.json({ success: false, error: `Slack webhook error ${r.status}: ${body}` }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
