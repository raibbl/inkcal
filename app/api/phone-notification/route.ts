import { NextRequest, NextResponse } from 'next/server';
import { safeEqual } from '@/lib/auth';
import { setNotification } from '@/lib/kv';

function isAuthorized(req: NextRequest): boolean {
  const provided = req.headers.get('x-webhook-secret') ?? '';
  const expected = process.env.PHONE_WEBHOOK_SECRET ?? '';
  return safeEqual(provided, expected);
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);

  if (!body || typeof body.sender !== 'string' || typeof body.message !== 'string') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  setNotification(body.sender, body.message);

  return NextResponse.json({ ok: true });
}
