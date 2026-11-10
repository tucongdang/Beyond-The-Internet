/**
 * Claude Design System & Dataviz Tokens (from jimliu/baoyu-design)
 * Sources:
 * - skills/claude-design/artifact-type/reference/brand-colors.md
 * - skills/claude-design/artifact-type/reference/brand-typography.md
 * - skills/dataviz/references/palette.md
 */

export const CLAUDE_BRAND_COLORS = {
  /** Claude primary (Clay — the Spark's color): accents, single emphasis color on Claude surfaces */
  clay: '#D97757',
  /** Claude background (Ivory 050): light page/artboard background & primary ink on dark surfaces */
  ivory: '#FAF9F5',
  /** Claude text (Slate 950): dark page ground & primary ink on light surfaces */
  slate: '#141413',
  /** Claude accent (Oat): subtle fills, dividers, secondary warm highlight */
  oat: '#E3DACC',
  /** Main accent (Blue): primary accent for non-Claude actions */
  blueLight: '#2A78D6',
  blueDark: '#3987E5',
  /** Prismatic secondary colors (illustrations, badges, compositions) */
  fig: '#C46686',
  sky: '#6A9BCC',
  olive: '#788C5D',
  coral: '#EBCECE',
  heather: '#CBCADB',
  cactus: '#BCD1CA',
} as const;

/**
 * 21-step Warm Grayscale (1000 black -> 000 white)
 * Never substitute cool/neutral gray ramps.
 */
export const CLAUDE_WARM_GRAYSCALE = {
  1000: '#000000',
  950: '#141413', // Slate (Deep page ground)
  900: '#1A1918', // Primary dark surface (--surface-1)
  850: '#1F1E1D', // Elevated dark card surface (--surface-2)
  800: '#262624', // Interactive dark control surface (--surface-3)
  750: '#30302E', // Subtle dark border / divider
  700: '#3D3D3A', // Stronger dark border
  650: '#4D4C48',
  600: '#5E5D59',
  550: '#73726C',
  500: '#87867F', // Muted ink (axis/labels)
  450: '#9C9A92',
  400: '#B0AEA5',
  350: '#C2C0B6', // Secondary ink on dark surfaces
  300: '#D1CFC5',
  250: '#DEDCD1',
  200: '#E8E6DC',
  150: '#F0EEE6',
  100: '#F5F4ED',
  50: '#FAF9F5',  // Ivory (Primary ink on dark surfaces / Light ground)
  0: '#FFFFFF',
} as const;

/**
 * OKLab CVD-safe 8-slot Categorical Palette (skills/dataviz/references/palette.md)
 * Validated for adjacent Delta E >= 8 (CVD) and >= 15 (normal vision).
 */
export const CLAUDE_DATAVIZ_CATEGORICAL = [
  { slot: 1, name: 'blue', light: '#2a78d6', dark: '#3987e5' },
  { slot: 2, name: 'orange', light: '#eb6834', dark: '#d95926' },
  { slot: 3, name: 'aqua', light: '#1baf7a', dark: '#199e70' },
  { slot: 4, name: 'yellow', light: '#eda100', dark: '#c98500' },
  { slot: 5, name: 'magenta', light: '#e87ba4', dark: '#d55181' },
  { slot: 6, name: 'green', light: '#008300', dark: '#008300' },
  { slot: 7, name: 'violet', light: '#6250d6', dark: '#9085e9' },
  { slot: 8, name: 'red', light: '#e34948', dark: '#e66767' },
] as const;

/**
 * Fixed Status Palette (never themed; always paired with icon + text label)
 */
export const CLAUDE_STATUS_PALETTE = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
} as const;

/**
 * Returns the CVD-safe dark-surface categorical hex color for a quiz option key (A-F or 0-7)
 */
export function getOptionDatavizColor(keyOrIndex: string | number): string {
  if (typeof keyOrIndex === 'number') {
    const idx = Math.abs(Math.trunc(keyOrIndex)) % CLAUDE_DATAVIZ_CATEGORICAL.length;
    return CLAUDE_DATAVIZ_CATEGORICAL[idx].dark;
  }
  const normalized = keyOrIndex.trim().toUpperCase();
  const map: Record<string, string> = {
    A: CLAUDE_DATAVIZ_CATEGORICAL[0].dark, // #3987e5 (Blue)
    B: CLAUDE_BRAND_COLORS.clay,           // #D97757 (Claude Clay / Orange)
    C: CLAUDE_DATAVIZ_CATEGORICAL[2].dark, // #199e70 (Aqua)
    D: CLAUDE_DATAVIZ_CATEGORICAL[3].dark, // #c98500 (Yellow)
    E: CLAUDE_DATAVIZ_CATEGORICAL[4].dark, // #d55181 (Magenta)
    F: CLAUDE_DATAVIZ_CATEGORICAL[6].dark, // #9085e9 (Violet)
  };
  return map[normalized] || CLAUDE_BRAND_COLORS.clay;
}
