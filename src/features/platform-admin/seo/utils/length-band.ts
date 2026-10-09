export type LengthBand = 'short' | 'optimal' | 'long';

// Display range only (SEO_OPTIMAL); never blocks saving. Empty text has no band.
export function lengthBand(length: number, [min, max]: readonly [number, number]): LengthBand | null {
  if (length === 0) return null;
  if (length < min) return 'short';
  return length > max ? 'long' : 'optimal';
}
