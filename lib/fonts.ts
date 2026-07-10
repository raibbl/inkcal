import { readFileSync } from 'fs';

export interface OgFont {
  name: string;
  data: Buffer;
  weight: 400 | 700;
  style: 'normal';
}

export type FontFamily = 'monospace' | 'serif' | 'sans-serif';

const DEV_FONT_FILES: Record<FontFamily, { path: string; name: string }> = {
  monospace: { path: 'C:\\Windows\\Fonts\\courbd.ttf', name: 'Courier New' },
  serif: { path: 'C:\\Windows\\Fonts\\timesbd.ttf', name: 'Times New Roman' },
  'sans-serif': { path: 'C:\\Windows\\Fonts\\arialbd.ttf', name: 'Arial' },
};

/**
 * next/og's bundled default font resolves its path via `pathToFileURL`,
 * which is broken on `next dev` on Windows (ERR_INVALID_URL). Passing an
 * explicit font sidesteps that code path entirely. This falls back to a
 * local Windows system font matching the requested family for dev; on
 * Vercel/Linux the file won't exist, so it returns undefined and
 * next/og's default (which works fine there) is used instead.
 */
export function loadDevFont(family: FontFamily): OgFont[] | undefined {
  const font = DEV_FONT_FILES[family];
  try {
    const data = readFileSync(font.path);
    return [{ name: font.name, data, weight: 700, style: 'normal' }];
  } catch {
    return undefined;
  }
}

export function fontFamilyCss(family: FontFamily, devFont: OgFont[] | undefined): string {
  return devFont ? devFont[0].name : family;
}
