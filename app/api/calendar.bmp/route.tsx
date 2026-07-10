import { NextRequest } from 'next/server';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { timingSafeEqual } from 'crypto';
import { fetchNextEvents } from '@/lib/google';
import { getActiveNotification } from '@/lib/kv';
import { toMonochromeBmp } from '@/lib/bmp';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // sharp needs Node's runtime, not Edge

const WIDTH = 400;
const HEIGHT = 300;

function isAuthorized(req: NextRequest): boolean {
  const provided = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${process.env.ESP32_SECRET_KEY ?? ''}`;
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const [events, notification] = await Promise.all([
    fetchNextEvents(process.env.GOOGLE_CALENDAR_ID ?? 'primary', 4),
    Promise.resolve(getActiveNotification()),
  ]);

  const rendered = new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#fff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', padding: '16px 20px 8px' }}>
          <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: 2, color: '#000' }}>
            WORK AGENDA
          </span>
          <div style={{ height: 4, backgroundColor: '#000', marginTop: 8, width: '100%' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '4px 20px' }}>
          {events.length === 0 ? (
            <span style={{ fontSize: 18, color: '#000', marginTop: 12 }}>No upcoming events</span>
          ) : (
            events.map((event, i) => (
              <div
                key={i}
                style={{ display: 'flex', flexDirection: 'column', marginTop: i === 0 ? 6 : 10 }}
              >
                <span style={{ fontSize: 15, fontWeight: 700, color: '#000' }}>{event.time}</span>
                <span style={{ fontSize: 18, color: '#000' }}>{event.title}</span>
              </div>
            ))
          )}
        </div>

        {notification && (
          <div
            style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#000', padding: '8px 20px' }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
              {notification.sender}
            </span>
            <span style={{ fontSize: 13, color: '#fff' }}>
              {notification.message.length > 60
                ? `${notification.message.slice(0, 60)}...`
                : notification.message}
            </span>
          </div>
        )}
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
  );

  const pngBuffer = Buffer.from(await rendered.arrayBuffer());

  const { data, info } = await sharp(pngBuffer)
    .resize(WIDTH, HEIGHT)
    .grayscale()
    .threshold(128)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const bmpBuffer = toMonochromeBmp(data, info.width, info.height);

  return new Response(new Uint8Array(bmpBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'image/bmp',
      'Content-Length': String(bmpBuffer.length),
      'Cache-Control': 'no-store',
    },
  });
}
