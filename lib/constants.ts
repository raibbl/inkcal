// Zero imports on purpose - this is the one place the theme/size name
// lists can live that both server code (lib/themes.tsx, which pulls in
// fs/googleapis through lib/fonts.ts) and the client bundle (app/page.tsx)
// can import without pulling server-only modules into the browser.
export const THEME_NAMES = ['classic', 'bigDate', 'newspaper', 'ticket', 'chips'] as const;
export const SIZE_NAMES = ['small', 'medium', 'large'] as const;

export type ThemeName = (typeof THEME_NAMES)[number];
export type SizeName = (typeof SIZE_NAMES)[number];
