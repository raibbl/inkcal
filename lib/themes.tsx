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
  width: number;
  height: number;
  scale: (n: number) => number;
}

function classic({ events, notification, weather, now, timeZone, fontFamily, width, height, scale: s }: ThemeProps) {
  const headerDate = now
    .toLocaleDateString('en-US', { timeZone, weekday: 'long', month: 'short', day: 'numeric' })
    .toUpperCase();
  const headerTime = now.toLocaleTimeString('en-US', { timeZone, hour: 'numeric', minute: '2-digit', hour12: true });
  const subheaderText = weather ? `updated ${headerTime} · ${weather.tempF}°F ${weather.condition}` : `updated ${headerTime}`;

  return (
    <div
      style={{
        width: s(width),
        height: s(height),
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#fff',
        fontFamily,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', padding: `${s(14)}px ${s(20)}px ${s(8)}px` }}>
        <span style={{ fontSize: s(22), fontWeight: 700, letterSpacing: s(1), color: '#000' }}>{headerDate}</span>
        <span style={{ fontSize: s(13), fontWeight: 700, color: '#000', marginTop: s(2) }}>{subheaderText}</span>
        <div style={{ height: s(3), backgroundColor: '#000', marginTop: s(8), width: '100%' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: `${s(6)}px ${s(20)}px` }}>
        {events.length === 0 ? (
          <span style={{ fontSize: s(16), color: '#000', marginTop: s(12) }}>No upcoming events</span>
        ) : (
          events.map((event, i) => (
            <div
              key={i}
              style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginTop: i === 0 ? s(4) : s(12) }}
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
        <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#000', padding: `${s(8)}px ${s(20)}px` }}>
          <span style={{ fontSize: s(13), fontWeight: 700, color: '#fff' }}>FROM: {notification.sender.toUpperCase()}</span>
          <span style={{ fontSize: s(13), color: '#fff', marginTop: s(4) }}>
            {notification.message.length > 60 ? `${notification.message.slice(0, 60)}...` : notification.message}
          </span>
        </div>
      )}
    </div>
  );
}

function paper({ events, notification, weather, now, timeZone, fontFamily, width, height, scale: s }: ThemeProps) {
  const headerDate = now
    .toLocaleDateString('en-US', { timeZone, weekday: 'long', month: 'long', day: 'numeric' })
    .toUpperCase();
  const headerTime = now.toLocaleTimeString('en-US', { timeZone, hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
  const subheaderText = weather ? `updated ${headerTime} · ${weather.tempF}°F ${weather.condition}` : `updated ${headerTime}`;

  return (
    <div
      style={{
        width: s(width),
        height: s(height),
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#fff',
        fontFamily,
        padding: s(20),
        position: 'relative',
      }}
    >
      <div style={{ position: 'absolute', display: 'flex', top: s(9), left: s(9), right: s(9), bottom: s(9), border: `${s(1)}px solid #000` }} />
      <div style={{ position: 'absolute', display: 'flex', top: s(13), left: s(13), right: s(13), bottom: s(13), border: `${s(1)}px solid #000` }} />

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: s(8) }}>
        <span style={{ fontSize: s(16), letterSpacing: s(4), color: '#000' }}>{headerDate}</span>
        <span style={{ fontSize: s(9), letterSpacing: s(1), color: '#333', marginTop: s(5) }}>{subheaderText}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', marginTop: s(18), paddingLeft: s(6), paddingRight: s(6) }}>
        {events.length === 0 ? (
          <span style={{ fontSize: s(12), color: '#000' }}>No upcoming events</span>
        ) : (
          events.map((event, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'baseline',
                marginTop: i === 0 ? 0 : s(12),
              }}
            >
              <span style={{ fontSize: s(12), color: '#000' }}>
                {!event.isToday ? `${event.dayLabel} ` : ''}
                {event.title}
              </span>
              <div style={{ flex: 1, height: s(1), borderBottom: `${s(1)}px dashed #555`, marginLeft: s(4), marginRight: s(4) }} />
              <span style={{ fontSize: s(12), color: '#000' }}>{event.time}</span>
            </div>
          ))
        )}
      </div>

      {notification && (
        <div
          style={{
            position: 'absolute',
            display: 'flex',
            left: s(26),
            right: s(26),
            bottom: s(24),
            justifyContent: 'center',
            fontSize: s(11),
            color: '#000',
          }}
        >
          {notification.sender}: {notification.message}
        </div>
      )}
    </div>
  );
}

function badge({ events, notification, weather, now, timeZone, fontFamily, width, height, scale: s }: ThemeProps) {
  const dayNumber = now.toLocaleDateString('en-US', { timeZone, day: 'numeric' });
  const weekday = now.toLocaleDateString('en-US', { timeZone, weekday: 'long' }).toUpperCase();
  const headerTime = now.toLocaleTimeString('en-US', { timeZone, hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
  const subheaderText = weather ? `updated ${headerTime} · ${weather.tempF}°F ${weather.condition}` : `updated ${headerTime}`;

  return (
    <div
      style={{
        width: s(width),
        height: s(height),
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#fff',
        fontFamily,
        padding: s(14),
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: s(10) }}>
        <div
          style={{
            display: 'flex',
            width: s(34),
            height: s(34),
            borderRadius: s(34),
            backgroundColor: '#000',
            color: '#fff',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: s(16),
            fontWeight: 700,
          }}
        >
          {dayNumber}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: s(11), letterSpacing: s(2), color: '#000' }}>{weekday}</span>
          <span style={{ fontSize: s(9), color: '#333' }}>{subheaderText}</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', marginTop: s(10), flex: 1 }}>
        {events.length === 0 ? (
          <span style={{ fontSize: s(12), color: '#000' }}>No upcoming events</span>
        ) : (
          events.map((event, i) => {
            const shaded = i % 2 === 1;
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: `${s(4)}px ${s(6)}px`,
                  marginTop: i === 0 ? 0 : s(2),
                  backgroundColor: shaded ? '#000' : 'transparent',
                }}
              >
                <span style={{ fontSize: s(11), width: s(64), color: shaded ? '#ccc' : '#333' }}>
                  {!event.isToday ? `${event.dayLabel} ` : ''}
                  {event.time}
                </span>
                <span style={{ fontSize: s(12), fontWeight: 700, color: shaded ? '#fff' : '#000' }}>{event.title}</span>
              </div>
            );
          })
        )}
      </div>

      {notification && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            borderTop: `${s(1)}px solid #000`,
            paddingTop: s(8),
            marginTop: s(8),
          }}
        >
          <span style={{ fontSize: s(11), color: '#000' }}>
            {notification.sender}: {notification.message}
          </span>
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
  paper: { fontFamily: 'serif', render: paper },
  badge: { fontFamily: 'sans-serif', render: badge },
};

export const themeNames = Object.keys(themes);
export const DEFAULT_THEME = 'classic';
