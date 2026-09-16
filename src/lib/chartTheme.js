/**
 * One resolver for every dashboard chart's colors.
 *
 * The dashboard palette is scoped to `.dashboard-shell` (see styles/auth.css —
 * the base, dark, and all four accent-template blocks select
 * `.dashboard-shell, body:has(.dashboard-shell)`, never `<html>`). Reading the
 * tokens off `document.documentElement` therefore yields the *public site's*
 * palette, which is a different hue family: charts come out tinted unlike
 * every other surface around them, and `--win`/`--loss` land on a different
 * red and green than the P&L figures beside the chart.
 *
 * This module exists because two pages had grown their own near-identical
 * copies of this logic and only one of them read the right element.
 */

/** Used only where there is no document to read (SSR, tests). */
const FALLBACK = '0 0% 50%';

/**
 * `getPropertyValue` is cheap; the `getComputedStyle` in front of it forces a
 * style recalc. Resolving one style object and reading every token from it
 * costs a single recalc instead of one per token.
 */
function readTokens(names) {
  if (typeof document === 'undefined') {
    return Object.fromEntries(names.map((name) => [name, FALLBACK]));
  }
  // `body:has(.dashboard-shell)` also carries the palette, but the shell
  // itself is the element the rules are written for and the one that exists
  // on every dashboard route.
  const scope = document.querySelector('.dashboard-shell') ?? document.documentElement;
  const style = getComputedStyle(scope);
  return Object.fromEntries(
    names.map((name) => [name, style.getPropertyValue(name).trim() || FALLBACK])
  );
}

const TOKEN_NAMES = [
  '--primary', '--win', '--loss', '--border', '--muted-foreground',
  '--popover', '--foreground',
  '--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5',
];

/**
 * Resolves the dashboard chart palette from the live CSS tokens.
 *
 * Use `useChartTheme` in React consumers so colors are refreshed after the
 * provider commits theme classes. Reading during render sees the old palette.
 *
 * @returns {object} Ready-to-use CSS color strings.
 */
export function resolveChartTheme() {
  const t = readTokens(TOKEN_NAMES);
  const hsl = (name, alpha) => (alpha == null ? `hsl(${t[name]})` : `hsl(${t[name]} / ${alpha})`);

  return {
    // P&L encoding. Reserved for value sign — never for series identity.
    win: hsl('--win', 0.75),
    winBorder: hsl('--win'),
    loss: hsl('--loss', 0.75),
    lossBorder: hsl('--loss'),

    // Chart chrome.
    grid: hsl('--border', 0.5),
    ticks: hsl('--muted-foreground'),
    border: hsl('--border'),
    tooltipBg: hsl('--popover', 0.96),
    tooltipTitle: hsl('--muted-foreground'),
    tooltipBody: hsl('--foreground'),

    // The accent line/area used by the equity curve.
    primary: hsl('--primary'),
    primaryFill: hsl('--primary', 0.22),
    primaryClear: hsl('--primary', 0),

    /**
     * The categorical ramp, in order. `--chart-1` tracks the accent; 2-5 are
     * the theme's supporting hues. Five is the whole budget — a chart needing
     * a sixth series is a chart that should be a table.
     */
    series: [hsl('--chart-1'), hsl('--chart-2'), hsl('--chart-3'), hsl('--chart-4'), hsl('--chart-5')],
    seriesSoft: [
      hsl('--chart-1', 0.8), hsl('--chart-2', 0.8), hsl('--chart-3', 0.8),
      hsl('--chart-4', 0.8), hsl('--chart-5', 0.8),
    ],
  };
}

/** Cycles the ramp so a category list longer than the budget still renders. */
export function seriesColor(theme, index, soft = false) {
  const ramp = soft ? theme.seriesSoft : theme.series;
  return ramp[index % ramp.length];
}
