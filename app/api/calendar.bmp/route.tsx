import { NextRequest, NextResponse } from 'next/server';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { safeEqual } from '@/lib/auth';
import { THEME_NAMES, SIZE_NAMES, ThemeName, SizeName } from '@/lib/constants';
import { fetchNextEvents, CalendarEventSummary } from '@/lib/google';
import { getActiveNotification, clearNotification, PhoneNotification } from '@/lib/kv';
import { toMonochromeBmp, toPackedMonochrome } from '@/lib/bmp';
import { loadDevFont, fontFamilyCss } from '@/lib/fonts';
import { fetchWeather, WeatherSummary } from '@/lib/weather';
import { themes, DEFAULT_THEME } from '@/lib/themes';

// Narrows a query-param string to one of a known set of valid values,
// falling back to a default - used for ?theme= and ?size= below so an
// unrecognized or missing value can't reach code that assumes it's valid.
function pickValid<T extends string>(value: string, valid: readonly T[], fallback: T): T {
  return (valid as readonly string[]).includes(value) ? (value as T) : fallback;
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // sharp needs Node's runtime, not Edge

const WIDTH = 400;
const HEIGHT = 300;
const SUPERSAMPLE = 4; // render at 4x, then downscale before thresholding for cleaner edges

// One Record per size instead of two parallel ones - a typo or a
// forgotten update to just one of two maps would silently produce
// windowSize=undefined, then totalPages=NaN, then an empty page (slice()
// treats NaN as 0) with no error anywhere. Typed as Record<SizeName, ...>
// so a mismatch with SIZE_NAMES in lib/constants.ts is a compile error.
//
// scale: multiplies fonts/spacing within the canvas - NOT the canvas
// itself, which must always be exactly SUPERSAMPLE*WIDTH/HEIGHT so the
// final sharp resize still lands on the fixed 400x300 physical output.
//
// maxEvents: the canvas is a fixed 300px tall - "medium" already has no
// headroom for 4 events, so "large" shows fewer of them per page instead
// of clipping.
const SIZE_CONFIG: Record<SizeName, { scale: number; maxEvents: number }> = {
  small: { scale: 0.9, maxEvents: 4 },
  medium: { scale: 1, maxEvents: 3 },
  large: { scale: 1.08, maxEvents: 2 },
};
const DEFAULT_SIZE: SizeName = 'medium';

// Fetched once per request and paged through client-side (dial Up/Down)
// rather than re-fetched per page. Bounded to a real week rather than a
// fixed count, so pagination naturally covers "this week" regardless of
// how densely booked it is - MAX_EVENT_FETCH_CAP just guards against a
// pathologically over-booked week blowing up the render.
const DAYS_AHEAD = 7;
const MAX_EVENT_FETCH_CAP = 40;

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
  if (safeEqual(providedHeader, `Bearer ${expectedKey}`)) return true;

  // Fallback: ?key=<key> query param, so a plain link (browser, WhatsApp
  // preview, etc.) works without being able to set a custom header.
  const providedQueryKey = req.nextUrl.searchParams.get('key') ?? '';
  return safeEqual(providedQueryKey, expectedKey);
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
        fetchNextEvents(process.env.GOOGLE_CALENDAR_ID ?? 'primary', MAX_EVENT_FETCH_CAP, DAYS_AHEAD),
        Promise.resolve(getActiveNotification()),
        process.env.WEATHER_LAT && process.env.WEATHER_LON
          ? fetchWeather(process.env.WEATHER_LAT, process.env.WEATHER_LON)
          : Promise.resolve(null),
      ]);

  // A manual MENU-button refresh counts as "seen" - clear it so it
  // doesn't keep showing until the 30-minute TTL. This still renders in
  // the response the user is about to see; only the *next* request
  // won't have it. Theme/size/page switches and the automatic polling
  // timers don't send ?ack=1, so they never clear it on their own.
  if (!isMock && notification && req.nextUrl.searchParams.get('ack') === '1') {
    clearNotification();
  }

  const timeZone = process.env.DISPLAY_TIMEZONE || 'UTC';
  const now = new Date();

  const themeName = pickValid(req.nextUrl.searchParams.get('theme') ?? DEFAULT_THEME, THEME_NAMES, DEFAULT_THEME);
  const theme = themes[themeName];

  const sizeName = pickValid(req.nextUrl.searchParams.get('size') ?? DEFAULT_SIZE, SIZE_NAMES, DEFAULT_SIZE);
  const { scale: sizeMultiplier, maxEvents: windowSize } = SIZE_CONFIG[sizeName];

  const totalPages = Math.max(1, Math.ceil(events.length / windowSize));
  // The firmware just increments/decrements an arbitrary counter (it has no
  // way to know how many pages of real events exist) - wrap it into range
  // here rather than expecting the caller to know totalPages in advance.
  const requestedPage = parseInt(req.nextUrl.searchParams.get('page') ?? '0', 10);
  const page = ((Number.isFinite(requestedPage) ? requestedPage : 0) % totalPages + totalPages) % totalPages;

  if (req.nextUrl.searchParams.get('format') === 'json') {
    return NextResponse.json({
      theme: themeName,
      availableThemes: THEME_NAMES,
      size: sizeName,
      availableSizes: SIZE_NAMES,
      page,
      totalPages,
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
  const visibleEvents = events.slice(page * windowSize, (page + 1) * windowSize);

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
      page,
      totalPages,
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
