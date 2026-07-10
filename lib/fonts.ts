import { readFileSync } from 'fs';

export interface OgFont {
  name: string;
  data: Buffer;
  weight: 400 | 700;
  style: 'normal';
}

/**
 * next/og's bundled default font resolves its path via `pathToFileURL`,
 * which is broken on `next dev` on Windows (ERR_INVALID_URL). Passing an
 * explicit font sidesteps that code path entirely. This falls back to a
 * local Windows system font for dev; on Vercel/Linux the file won't
 * exist, so it returns undefined and next/og's default (which works
 * fine there) is used instead.
 */
export function loadDevFont(): OgFont[] | undefined {
  try {
    const data = readFileSync('C:\\Windows\\Fonts\\courbd.ttf');
    return [{ name: 'Courier New', data, weight: 700, style: 'normal' }];
  } catch {
    return undefined;
  }
}
