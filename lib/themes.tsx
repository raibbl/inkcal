import { CalendarEventSummary } from '@/lib/google';
import { PhoneNotification } from '@/lib/kv';
import { WeatherSummary } from '@/lib/weather';
import { FontFamily } from '@/lib/fonts';

export interface ThemeProps {
  events: CalendarEventSummary[];
  notification: PhoneNotification | null;
  weather: WeatherSummary | null;
  now: Date;
  timeZone: string;
  fontFamily: string;
  canvasWidth: number;
  canvasHeight: number;
  scale: (n: number) => number;
}

// The canvas is a fixed 400x300 - there's no scrolling or dynamic growth,
// so any line that wraps onto a second line just overlaps whatever comes
// after it. Truncating keeps every line single-row regardless of how
// long a real calendar title or SMS happens to be.
function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function classic({ events, notification, weather, now, timeZone, fontFamily, canvasWidth, canvasHeight, scale: s }: ThemeProps) {
  const headerDate = now
    .toLocaleDateString('en-US', { timeZone, weekday: 'long', month: 'short', day: 'numeric' })
    .toUpperCase();
  const headerTime = now.toLocaleTimeString('en-US', { timeZone, hour: 'numeric', minute: '2-digit', hour12: true });
  const subheaderText = weather ? `U@ ${headerTime} · ${weather.tempF}°F ${weather.condition}` : `U@ ${headerTime}`;

  return (
    <div
      style={{
        width: canvasWidth,
        height: canvasHeight,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#fff',
        fontFamily,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', padding: `${s(12)}px ${s(16)}px ${s(6)}px` }}>
        <span style={{ fontSize: s(30), fontWeight: 700, letterSpacing: s(1), color: '#000' }}>{headerDate}</span>
        <span style={{ fontSize: s(18), fontWeight: 400, color: '#000', marginTop: s(2) }}>{subheaderText}</span>
        <div style={{ height: s(3), backgroundColor: '#000', marginTop: s(6), width: '100%' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: `${s(4)}px ${s(16)}px` }}>
        {events.length === 0 ? (
          <span style={{ fontSize: s(21), color: '#000', marginTop: s(10) }}>No upcoming events</span>
        ) : (
          events.map((event, i) => (
            <div
              key={i}
              style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginTop: i === 0 ? s(2) : s(9) }}
            >
              {!event.isToday && (
                <div
                  style={{
                    display: 'flex',
                    backgroundColor: '#000',
                    color: '#fff',
                    fontSize: s(15),
                    fontWeight: 700,
                    padding: `${s(2)}px ${s(6)}px`,
                    marginRight: s(8),
                  }}
                >
                  {event.dayLabel}
                </div>
              )}
              <span style={{ fontSize: s(22), fontWeight: 400, color: '#000' }}>
                • {event.time} - {truncate(event.title, 10)}
              </span>
            </div>
          ))
        )}
      </div>

      {notification && (
        <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#000', padding: `${s(7)}px ${s(16)}px` }}>
          <span style={{ fontSize: s(16), fontWeight: 700, color: '#fff' }}>FROM: {notification.sender.toUpperCase()}</span>
          <span style={{ fontSize: s(16), color: '#fff', marginTop: s(3) }}>{truncate(notification.message, 42)}</span>
        </div>
      )}
    </div>
  );
}

function bigDate({ events, notification, weather, now, timeZone, fontFamily, canvasWidth, canvasHeight, scale: s }: ThemeProps) {
  const dayNumber = now.toLocaleDateString('en-US', { timeZone, day: 'numeric' });
  const weekday = now.toLocaleDateString('en-US', { timeZone, weekday: 'long' });
  const monthYear = now.toLocaleDateString('en-US', { timeZone, month: 'long', year: 'numeric' });
  const headerTime = now.toLocaleTimeString('en-US', { timeZone, hour: 'numeric', minute: '2-digit', hour12: true });

  return (
    <div
      style={{
        width: canvasWidth,
        height: canvasHeight,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#fff',
        fontFamily,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-end',
          backgroundColor: '#000',
          padding: `${s(6)}px ${s(10)}px`,
        }}
      >
        <span style={{ fontSize: s(42), fontWeight: 700, color: '#fff', lineHeight: 1 }}>{dayNumber}</span>
        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: s(8) }}>
          <span style={{ fontSize: s(18), color: '#fff' }}>{weekday}</span>
          <span style={{ fontSize: s(16), color: '#fff' }}>{monthYear}</span>
        </div>
        <span style={{ fontSize: s(14), color: '#fff', marginLeft: 'auto' }}>U@ {headerTime}</span>
      </div>
      {weather && (
        <div style={{ display: 'flex', fontSize: s(17), color: '#000', padding: `${s(4)}px ${s(10)}px 0` }}>
          {weather.tempF}°F {weather.condition}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: `${s(6)}px ${s(10)}px` }}>
        {events.length === 0 ? (
          <span style={{ fontSize: s(17), color: '#000' }}>No upcoming events</span>
        ) : (
          events.map((event, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'row',
                padding: `${s(3)}px 0`,
                borderBottom: i === events.length - 1 ? 'none' : `${s(1)}px solid #000`,
              }}
            >
              <span style={{ fontSize: s(15), width: s(120), color: '#000' }}>
                {!event.isToday ? `${event.dayLabel} ` : ''}
                {event.time}
              </span>
              <span style={{ fontSize: s(18), fontWeight: 400, color: '#000' }}>{truncate(event.title, 22)}</span>
            </div>
          ))
        )}
      </div>

      {notification && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            borderTop: `${s(1)}px solid #000`,
            padding: `${s(6)}px ${s(16)}px`,
            fontSize: s(15),
            color: '#000',
          }}
        >
          &ldquo; {notification.sender}: {truncate(notification.message, 34)} &rdquo;
        </div>
      )}
    </div>
  );
}

function newspaper({ events, notification, weather, now, timeZone, fontFamily, canvasWidth, canvasHeight, scale: s }: ThemeProps) {
  const headerDate = now.toLocaleDateString('en-US', { timeZone, weekday: 'long', month: 'short', day: 'numeric' });
  const headerTime = now.toLocaleTimeString('en-US', { timeZone, hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
  const subheaderText = weather
    ? `${headerDate} - U@ ${headerTime} - ${weather.tempF}°F ${weather.condition}`
    : `${headerDate} - U@ ${headerTime}`;

  return (
    <div
      style={{
        width: canvasWidth,
        height: canvasHeight,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#fff',
        fontFamily,
        padding: `${s(10)}px ${s(16)}px`,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span style={{ fontSize: s(26), fontWeight: 700 }}>The Daily Agenda</span>
        <span style={{ fontSize: s(14), marginTop: s(2) }}>{subheaderText}</span>
        <div style={{ height: s(2), backgroundColor: '#000', marginTop: s(4), width: '100%' }} />
        <div style={{ height: s(1), backgroundColor: '#000', marginTop: s(2), width: '100%' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', marginTop: s(8), flex: 1 }}>
        {events.length === 0 ? (
          <span style={{ fontSize: s(17) }}>No upcoming events</span>
        ) : (
          events.map((event, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'row',
                borderTop: `${s(1)}px solid #000`,
                paddingTop: s(5),
                marginTop: i === 0 ? 0 : s(5),
                fontSize: s(17),
              }}
            >
              <span>
                {event.time} &mdash; {truncate(event.title, 18)}
                {!event.isToday ? ` (${event.dayLabel})` : ''}
              </span>
            </div>
          ))
        )}
      </div>

      {notification && (
        <div style={{ display: 'flex', justifyContent: 'center', fontSize: s(14), marginTop: s(5) }}>
          {notification.sender}: {truncate(notification.message, 40)}
        </div>
      )}
    </div>
  );
}

function ticket({ events, notification, weather, now, timeZone, fontFamily, canvasWidth, canvasHeight, scale: s }: ThemeProps) {
  const headerDate = now.toLocaleDateString('en-US', { timeZone, weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
  const headerTime = now.toLocaleTimeString('en-US', { timeZone, hour: 'numeric', minute: '2-digit', hour12: true });

  return (
    <div
      style={{
        width: canvasWidth,
        height: canvasHeight,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#fff',
        fontFamily,
        border: `${s(2)}px dashed #000`,
        padding: `${s(10)}px ${s(14)}px`,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
        <span style={{ fontSize: s(21), fontWeight: 700 }}>{headerDate}</span>
        <span style={{ fontSize: s(17), color: '#000' }}>
          {weather ? `${weather.tempF}°F ${weather.condition}` : `U@ ${headerTime}`}
        </span>
      </div>
      <span style={{ fontSize: s(15), color: '#000', marginTop: s(1) }}>U@ {headerTime}</span>

      <div style={{ display: 'flex', flexDirection: 'column', marginTop: s(7), flex: 1 }}>
        {events.length === 0 ? (
          <span style={{ fontSize: s(17) }}>No upcoming events</span>
        ) : (
          events.map((event, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                borderTop: `${s(1)}px dashed #000`,
                paddingTop: s(5),
                marginTop: i === 0 ? 0 : s(5),
              }}
            >
              <span style={{ fontSize: s(17) }}>
                {truncate(event.title, 16)}
                {!event.isToday ? ` (${event.dayLabel})` : ''}
              </span>
              <span style={{ fontSize: s(17), fontWeight: 700 }}>{event.time}</span>
            </div>
          ))
        )}
      </div>

      {notification && (
        <div style={{ display: 'flex', borderTop: `${s(2)}px dashed #000`, paddingTop: s(6), marginTop: s(6), fontSize: s(15) }}>
          &raquo; {notification.sender}: {truncate(notification.message, 32)}
        </div>
      )}
    </div>
  );
}

function chips({ events, notification, weather, now, timeZone, fontFamily, canvasWidth, canvasHeight, scale: s }: ThemeProps) {
  const headerDate = now.toLocaleDateString('en-US', { timeZone, weekday: 'long', month: 'short', day: 'numeric' });
  const headerTime = now.toLocaleTimeString('en-US', { timeZone, hour: 'numeric', minute: '2-digit', hour12: true });
  const subheaderText = weather ? `U@ ${headerTime} · ${weather.tempF}°F ${weather.condition}` : `U@ ${headerTime}`;

  return (
    <div
      style={{
        width: canvasWidth,
        height: canvasHeight,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#fff',
        fontFamily,
        padding: s(12),
      }}
    >
      <span style={{ fontSize: s(21), fontWeight: 700 }}>{headerDate}</span>
      <span style={{ fontSize: s(16), color: '#000', marginTop: s(2) }}>{subheaderText}</span>

      <div style={{ display: 'flex', flexDirection: 'column', marginTop: s(8), flex: 1, gap: s(5) }}>
        {events.length === 0 ? (
          <span style={{ fontSize: s(17) }}>No upcoming events</span>
        ) : (
          events.map((event, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: `${s(1)}px solid #000`,
                borderRadius: s(6),
                padding: `${s(4)}px ${s(8)}px`,
              }}
            >
              <span style={{ fontSize: s(17) }}>
                {truncate(event.title, 14)}
                {!event.isToday ? ` (${event.dayLabel})` : ''}
              </span>
              <span style={{ fontSize: s(17), fontWeight: 700 }}>{event.time}</span>
            </div>
          ))
        )}
      </div>

      {notification && (
        <div
          style={{
            display: 'flex',
            border: `${s(1)}px solid #000`,
            borderRadius: s(6),
            padding: `${s(5)}px ${s(8)}px`,
            marginTop: s(5),
            fontSize: s(15),
          }}
        >
          {notification.sender}: {truncate(notification.message, 38)}
        </div>
      )}
    </div>
  );
}

interface ThemeDefinition {
  fontFamily: FontFamily;
  render: (props: ThemeProps) => JSX.Element;
}

export const themes: Record<string, ThemeDefinition> = {
  classic: { fontFamily: 'monospace', render: classic },
  bigDate: { fontFamily: 'sans-serif', render: bigDate },
  newspaper: { fontFamily: 'serif', render: newspaper },
  ticket: { fontFamily: 'monospace', render: ticket },
  chips: { fontFamily: 'sans-serif', render: chips },
};

export const themeNames = Object.keys(themes);
export const DEFAULT_THEME = 'classic';
