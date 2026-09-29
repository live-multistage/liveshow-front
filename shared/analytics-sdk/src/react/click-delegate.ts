import { isValidEventName, type Json } from '@live-show/api-contracts';
import type { Analytics } from '../core/analytics';

const defaultWarn = (message: string): void => {
  const isProduction = typeof process !== 'undefined' && process.env.NODE_ENV === 'production';
  if (!isProduction) console.warn(message);
};

const isPlainObject = (value: unknown): value is Record<string, Json> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Delegates clicks on any `[data-track]` element to `trackUntyped`.
 * `data-track-props` is optional JSON; invalid JSON is dropped (props omitted), never thrown.
 */
export function installClickDelegate(
  root: Document,
  a: Pick<Analytics, 'trackUntyped'>,
  onWarn: (m: string) => void = defaultWarn,
): () => void {
  const onClick = (event: MouseEvent): void => {
    const target = event.target as Element | null;
    const el = target?.closest?.('[data-track]');
    if (!el) return;

    const name = el.getAttribute('data-track') ?? '';
    if (!isValidEventName(name)) {
      onWarn(`[analytics] ignoring click with invalid data-track name: "${name}"`);
      return;
    }

    let props: Record<string, Json> | undefined;
    const raw = el.getAttribute('data-track-props');
    if (raw) {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (isPlainObject(parsed)) {
          props = parsed;
        } else {
          onWarn(`[analytics] ignoring invalid data-track-props JSON on "${name}"`);
        }
      } catch {
        onWarn(`[analytics] ignoring invalid data-track-props JSON on "${name}"`);
      }
    }

    a.trackUntyped(name, props);
  };

  root.addEventListener('click', onClick, true);
  return () => root.removeEventListener('click', onClick, true);
}
