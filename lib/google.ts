import { google, calendar_v3 } from 'googleapis';

export interface CalendarEventSummary {
  time: string;
  title: string;
  isToday: boolean;
  dayLabel: string;
}

// Fixed on purpose - the desk doesn't move, and the server's own
// timezone varies by environment (UTC on Vercel, local time in dev),
// so relying on it would show the wrong time on the physical display.
const TIMEZONE = process.env.DISPLAY_TIMEZONE || 'UTC';

const dayKey = (d: Date) =>
  d.toLocaleDateString('en-US', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' });

let cachedClient: calendar_v3.Calendar | null = null;

function getCalendarClient(): calendar_v3.Calendar {
  if (cachedClient) return cachedClient;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  cachedClient = google.calendar({ version: 'v3', auth: oauth2Client });
  return cachedClient;
}

export async function fetchNextEvents(
  calendarId: string,
  maxResults = 4,
  daysAhead = 7
): Promise<CalendarEventSummary[]> {
  const calendar = getCalendarClient();

  const today = new Date();
  const timeMax = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  const res = await calendar.events.list({
    calendarId,
    timeMin: today.toISOString(),
    timeMax: timeMax.toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: 'startTime',
  });

  const events = res.data.items ?? [];

  return events.map((event) => {
    const start = event.start?.dateTime ?? event.start?.date;
    const startDate = start ? new Date(start) : null;

    const time = startDate
      ? startDate.toLocaleTimeString('en-US', { timeZone: TIMEZONE, hour: 'numeric', minute: '2-digit' })
      : 'All day';

    const isToday = startDate ? dayKey(startDate) === dayKey(today) : false;
    const dayLabel = startDate
      ? startDate.toLocaleDateString('en-US', { timeZone: TIMEZONE, weekday: 'short' }).toUpperCase()
      : '';

    return { time, title: event.summary ?? '(No title)', isToday, dayLabel };
  });
}
