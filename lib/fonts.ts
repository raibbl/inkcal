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
const BUNDLED_FONTS: Record<FontFamily, { name: string; regular: string; bold: string }> = {
  monospace: {
    name: 'Roboto Mono',
    regular: 'node_modules/@fontsource/roboto-mono/files/roboto-mono-latin-400-normal.woff',
    bold: 'node_modules/@fontsource/roboto-mono/files/roboto-mono-latin-700-normal.woff',
  },
  serif: {
    name: 'Merriweather',
    regular: 'node_modules/@fontsource/merriweather/files/merriweather-latin-400-normal.woff',
    bold: 'node_modules/@fontsource/merriweather/files/merriweather-latin-700-normal.woff',
  },
  'sans-serif': {
    name: 'Inter',
    regular: 'node_modules/@fontsource/inter/files/inter-latin-400-normal.woff',
    bold: 'node_modules/@fontsource/inter/files/inter-latin-700-normal.woff',
  },
};

// Both weights are registered under the same font name - satori picks
// between them based on the fontWeight in each element's style, giving
// real bold-vs-regular contrast instead of everything rendering bold
// because only one weight was ever loaded.
export function loadDevFont(family: FontFamily): OgFont[] {
  const font = BUNDLED_FONTS[family];
  return [
    { name: font.name, data: readFileSync(path.join(process.cwd(), font.regular)), weight: 400, style: 'normal' },
    { name: font.name, data: readFileSync(path.join(process.cwd(), font.bold)), weight: 700, style: 'normal' },
  ];
}

export function fontFamilyCss(family: FontFamily, devFont: OgFont[]): string {
  return devFont[0].name;
}
