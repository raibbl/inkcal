import { google, calendar_v3 } from 'googleapis';

export interface CalendarEventSummary {
  time: string;
  title: string;
  isToday: boolean;
  dayLabel: string;
}

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
  maxResults = 4
): Promise<CalendarEventSummary[]> {
  const calendar = getCalendarClient();

  const res = await calendar.events.list({
    calendarId,
    timeMin: new Date().toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: 'startTime',
  });

  const events = res.data.items ?? [];
  const today = new Date();

  return events.map((event) => {
    const start = event.start?.dateTime ?? event.start?.date;
    const startDate = start ? new Date(start) : null;

    const time = startDate
      ? startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      : 'All day';

    const isToday = startDate ? startDate.toDateString() === today.toDateString() : false;
    const dayLabel = startDate
      ? startDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
      : '';

    return { time, title: event.summary ?? '(No title)', isToday, dayLabel };
  });
}
