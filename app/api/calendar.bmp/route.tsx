import { NextRequest } from 'next/server';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { timingSafeEqual } from 'crypto';
import { fetchNextEvents, CalendarEventSummary } from '@/lib/google';
import { getActiveNotification, PhoneNotification } from '@/lib/kv';
import { toMonochromeBmp } from '@/lib/bmp';
import { loadDevFont } from '@/lib/fonts';
import { fetchWeather, WeatherSummary } from '@/lib/weather';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // sharp needs Node's runtime, not Edge

const WIDTH = 400;
const HEIGHT = 300;
const SUPERSAMPLE = 2; // render at 2x, then downscale before thresholding for cleaner edges
const s = (n: number) => n * SUPERSAMPLE;

const MOCK_EVENTS: CalendarEventSummary[] = [
  { time: '9:00 AM', title: 'Standup', isToday: true, dayLabel: '' },
  { time: '11:30 AM', title: 'PR Review', isToday: true, dayLabel: '' },
  { time: '2:00 PM', title: 'Espresso Break', isToday: true, dayLabel: '' },
  { time: '10:00 AM', title: 'Sprint Planning', isToday: false, dayLabel: 'TUE' },
];

const MOCK_NOTIFICATION: PhoneNotification = {
  sender: 'Sarah',
  message: 'Meeting moved to 3B',
  receivedAt: new Date().toISOString(),
};

const MOCK_WEATHER: WeatherSummary = { tempF: 72, condition: 'Partly Cloudy' };

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

  const isMock = req.nextUrl.searchParams.get('mock') === '1';

  const [events, notification, weather] = isMock
    ? [MOCK_EVENTS, MOCK_NOTIFICATION, MOCK_WEATHER]
    : await Promise.all([
        fetchNextEvents(process.env.GOOGLE_CALENDAR_ID ?? 'primary', 4),
        Promise.resolve(getActiveNotification()),
        process.env.WEATHER_LAT && process.env.WEATHER_LON
          ? fetchWeather(process.env.WEATHER_LAT, process.env.WEATHER_LON)
          : Promise.resolve(null),
      ]);

  const devFont = loadDevFont();

  const now = new Date();
  const headerDate = now
    .toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    .toUpperCase();
  const headerTime = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const subheaderText = weather
    ? `${headerTime} | ${weather.tempF}°F ${weather.condition}`
    : headerTime;

  const rendered = new ImageResponse(
    (
      <div
        style={{
          width: s(WIDTH),
          height: s(HEIGHT),
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#fff',
          fontFamily: devFont ? 'Courier New' : 'monospace',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: `${s(14)}px ${s(20)}px ${s(8)}px`,
          }}
        >
          <span style={{ fontSize: s(22), fontWeight: 700, letterSpacing: s(1), color: '#000' }}>
            {headerDate}
          </span>
          <span style={{ fontSize: s(13), fontWeight: 700, color: '#000', marginTop: s(2) }}>
            {subheaderText}
          </span>
          <div style={{ height: s(3), backgroundColor: '#000', marginTop: s(8), width: '100%' }} />
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            padding: `${s(6)}px ${s(20)}px`,
          }}
        >
          {events.length === 0 ? (
            <span style={{ fontSize: s(16), color: '#000', marginTop: s(12) }}>
              No upcoming events
            </span>
          ) : (
            events.map((event, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: i === 0 ? s(4) : s(12),
                }}
              >
                {!event.isToday && (
                  <div
                    style={{
                      display: 'flex',
                      backgroundColor: '#000',
                      color: '#fff',
                      fontSize: s(11),
                      fontWeight: 700,
                      padding: `${s(2)}px ${s(6)}px`,
                      marginRight: s(8),
                    }}
                  >
                    {event.dayLabel}
                  </div>
                )}
                <span style={{ fontSize: s(16), fontWeight: 700, color: '#000' }}>
                  • {event.time} - {event.title}
                </span>
              </div>
            ))
          )}
        </div>

        {notification && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#000',
              padding: `${s(8)}px ${s(20)}px`,
            }}
          >
            <span style={{ fontSize: s(13), fontWeight: 700, color: '#fff' }}>
              FROM: {notification.sender.toUpperCase()}
            </span>
            <span style={{ fontSize: s(13), color: '#fff', marginTop: s(4) }}>
              {notification.message.length > 60
                ? `${notification.message.slice(0, 60)}...`
                : notification.message}
            </span>
          </div>
        )}
      </div>
    ),
    { width: s(WIDTH), height: s(HEIGHT), fonts: devFont }
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
