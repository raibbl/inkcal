import { NextRequest, NextResponse } from 'next/server';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { timingSafeEqual } from 'crypto';
import { fetchNextEvents, CalendarEventSummary } from '@/lib/google';
import { getActiveNotification, PhoneNotification } from '@/lib/kv';
import { toMonochromeBmp, toPackedMonochrome } from '@/lib/bmp';
import { loadDevFont, fontFamilyCss } from '@/lib/fonts';
import { fetchWeather, WeatherSummary } from '@/lib/weather';
import { themes, themeNames, DEFAULT_THEME } from '@/lib/themes';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // sharp needs Node's runtime, not Edge

const WIDTH = 400;
const HEIGHT = 300;
const SUPERSAMPLE = 4; // render at 4x, then downscale before thresholding for cleaner edges

// Scales content (fonts/spacing) within the canvas - NOT the canvas
// itself, which must always be exactly SUPERSAMPLE*WIDTH/HEIGHT so the
// final sharp resize still lands on the fixed 400x300 physical output.
// Scaling both together and resizing to a fixed size would cancel out,
// with zero visible difference.
const SIZE_PRESETS: Record<string, number> = { small: 0.9, medium: 1, large: 1.08 };
const DEFAULT_SIZE = 'medium';
const sizeNames = Object.keys(SIZE_PRESETS);

// The canvas is a fixed 300px tall - "medium" already has no headroom
// for 4 events, so "large" shows fewer of them instead of clipping.
const MAX_EVENTS_FOR_SIZE: Record<string, number> = { small: 4, medium: 3, large: 2 };

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
  const expectedKey = process.env.ESP32_SECRET_KEY ?? '';

  // Primary path: ESP32 sends Authorization: Bearer <key>.
  const providedHeader = req.headers.get('authorization') ?? '';
  const expectedHeader = `Bearer ${expectedKey}`;
  if (
    providedHeader.length === expectedHeader.length &&
    timingSafeEqual(Buffer.from(providedHeader), Buffer.from(expectedHeader))
  ) {
    return true;
  }

  // Fallback: ?key=<key> query param, so a plain link (browser, WhatsApp
  // preview, etc.) works without being able to set a custom header.
  const providedQueryKey = req.nextUrl.searchParams.get('key') ?? '';
  if (providedQueryKey.length === expectedKey.length && expectedKey.length > 0) {
    return timingSafeEqual(Buffer.from(providedQueryKey), Buffer.from(expectedKey));
  }

  return false;
}

export async function GET(req: NextRequest) {
  const isMock = req.nextUrl.searchParams.get('mock') === '1';

  // Mock mode only ever returns hardcoded placeholder data, never real
  // calendar/notification info, so it's safe to expose without auth -
  // that's what lets a plain <img> tag on the public site preview it
  // (browsers can't attach an Authorization header to an <img src>).
  if (!isMock && !isAuthorized(req)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const [events, notification, weather] = isMock
    ? [MOCK_EVENTS, MOCK_NOTIFICATION, MOCK_WEATHER]
    : await Promise.all([
        fetchNextEvents(process.env.GOOGLE_CALENDAR_ID ?? 'primary', 4),
        Promise.resolve(getActiveNotification()),
        process.env.WEATHER_LAT && process.env.WEATHER_LON
          ? fetchWeather(process.env.WEATHER_LAT, process.env.WEATHER_LON)
          : Promise.resolve(null),
      ]);

  const timeZone = process.env.DISPLAY_TIMEZONE || 'UTC';
  const now = new Date();

  const requestedTheme = req.nextUrl.searchParams.get('theme') ?? DEFAULT_THEME;
  const themeName = themeNames.includes(requestedTheme) ? requestedTheme : DEFAULT_THEME;
  const theme = themes[themeName];

  const requestedSize = req.nextUrl.searchParams.get('size') ?? DEFAULT_SIZE;
  const sizeName = sizeNames.includes(requestedSize) ? requestedSize : DEFAULT_SIZE;
  const sizeMultiplier = SIZE_PRESETS[sizeName];

  if (req.nextUrl.searchParams.get('format') === 'json') {
    return NextResponse.json({
      theme: themeName,
      availableThemes: themeNames,
      size: sizeName,
      availableSizes: sizeNames,
      events,
      notification,
      weather,
    });
  }

  const devFont = loadDevFont(theme.fontFamily);
  const fontFamily = fontFamilyCss(theme.fontFamily, devFont);

  const canvasWidth = WIDTH * SUPERSAMPLE;
  const canvasHeight = HEIGHT * SUPERSAMPLE;
  const contentScale = (n: number) => n * SUPERSAMPLE * sizeMultiplier;
  const visibleEvents = events.slice(0, MAX_EVENTS_FOR_SIZE[sizeName]);

  const rendered = new ImageResponse(
    theme.render({
      events: visibleEvents,
      notification,
      weather,
      now,
      timeZone,
      fontFamily,
      canvasWidth,
      canvasHeight,
      scale: contentScale,
    }),
    { width: canvasWidth, height: canvasHeight, fonts: devFont }
  );

  const pngBuffer = Buffer.from(await rendered.arrayBuffer());

  const { data, info } = await sharp(pngBuffer)
    .resize(WIDTH, HEIGHT)
    .grayscale()
    .threshold(128)
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (req.nextUrl.searchParams.get('format') === 'raw') {
    const packedBuffer = toPackedMonochrome(data, info.width, info.height);
    return new Response(new Uint8Array(packedBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(packedBuffer.length),
        'Cache-Control': 'no-store',
      },
    });
  }

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
