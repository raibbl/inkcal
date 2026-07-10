import { readFileSync } from 'fs';
import path from 'path';

export interface OgFont {
  name: string;
  data: Buffer;
  weight: 400 | 700;
  style: 'normal';
}

export type FontFamily = 'monospace' | 'serif' | 'sans-serif';

// Real font files bundled via npm (SIL Open Font License), not OS system
// fonts - this way the exact same font renders identically in local dev
// and on Vercel/Linux production, instead of silently falling back to
// whatever generic font happens to be installed on each platform.
const BUNDLED_FONTS: Record<FontFamily, { file: string; name: string }> = {
  monospace: {
    file: 'node_modules/@fontsource/roboto-mono/files/roboto-mono-latin-700-normal.woff',
    name: 'Roboto Mono',
  },
  serif: {
    file: 'node_modules/@fontsource/merriweather/files/merriweather-latin-700-normal.woff',
    name: 'Merriweather',
  },
  'sans-serif': {
    file: 'node_modules/@fontsource/inter/files/inter-latin-700-normal.woff',
    name: 'Inter',
  },
};

export function loadDevFont(family: FontFamily): OgFont[] {
  const font = BUNDLED_FONTS[family];
  const data = readFileSync(path.join(process.cwd(), font.file));
  return [{ name: font.name, data, weight: 700, style: 'normal' }];
}

export function fontFamilyCss(family: FontFamily, devFont: OgFont[]): string {
  return devFont[0].name;
}
