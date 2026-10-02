import seriesStyles from './chart-series.module.scss';

// A series colour is a name, not a hex: the value lives in SCSS tokens and is
// applied as `color`, so the SVG draws with currentColor. The charts used to
// pick their own hexes (#ff5a4d, #9b7bff, #bba6ff, #46d6d8 — none of them in
// the palette), which is part of why they never matched the rest of the app.
export type SeriesColor = 'magenta' | 'violet' | 'amber' | 'pink' | 'green';

export function seriesClass(color: SeriesColor): string {
  return seriesStyles[color];
}
