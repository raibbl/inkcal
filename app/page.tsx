'use client';

import { useEffect, useState } from 'react';

// Kept in sync with the theme/size registries in the calendar.bmp route -
// not imported directly since that file pulls in server-only modules
// (fs, googleapis) through its type imports, which would leak into this
// client bundle.
const THEME_NAMES = ['classic', 'bigDate', 'newspaper', 'ticket', 'chips'];
const SIZE_NAMES = ['small', 'medium', 'large'];

export default function Home() {
  const [cacheBust, setCacheBust] = useState(0);
  const [theme, setTheme] = useState(THEME_NAMES[0]);
  const [sizeIndex, setSizeIndex] = useState(SIZE_NAMES.indexOf('medium'));
  const size = SIZE_NAMES[sizeIndex];

  useEffect(() => {
    const interval = setInterval(() => setCacheBust((n) => n + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 py-16"
      style={{ backgroundColor: '#ece6d9', color: '#2b271f' }}
    >
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'ui-monospace, monospace' }}>
          inkcal
        </h1>
        <p className="text-sm" style={{ color: '#6b6355' }}>
          A calendar and notification feed for an ESP32 e-paper desk display.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {THEME_NAMES.map((name) => (
          <button
            key={name}
            onClick={() => setTheme(name)}
            className="rounded-full px-3 py-1 text-sm"
            style={
              name === theme
                ? { backgroundColor: '#232019', color: '#fff' }
                : { backgroundColor: '#ddd5c2', color: '#2b271f' }
            }
          >
            {name}
          </button>
        ))}
        <button
          onClick={() => setSizeIndex((i) => (i + 1) % SIZE_NAMES.length)}
          className="rounded-full px-3 py-1 text-sm"
          style={{ backgroundColor: '#6b6355', color: '#fff' }}
        >
          size: {size}
        </button>
      </div>

      <div
        className="rounded-[28px] p-5 shadow-xl"
        style={{ backgroundColor: '#232019' }}
      >
        <div className="overflow-hidden rounded-[10px] bg-white">
          <img
            src={`/api/calendar.bmp?mock=1&theme=${theme}&size=${size}&cb=${cacheBust}`}
            width={400}
            height={300}
            alt="Live preview of the e-paper calendar display"
            style={{ imageRendering: 'pixelated', display: 'block' }}
          />
        </div>
      </div>

      <p className="max-w-md text-center text-sm" style={{ color: '#6b6355' }}>
        Device feed:{' '}
        <code className="rounded px-1.5 py-0.5" style={{ backgroundColor: '#ddd5c2' }}>
          /api/calendar.bmp
        </code>{' '}
        · Notification webhook:{' '}
        <code className="rounded px-1.5 py-0.5" style={{ backgroundColor: '#ddd5c2' }}>
          /api/phone-notification
        </code>
      </p>
    </main>
  );
}
