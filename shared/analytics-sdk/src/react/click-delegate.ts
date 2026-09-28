import { isValidEventName, type Json } from '@live-show/api-contracts';
import type { Analytics } from '../core/analytics';

const defaultWarn = (message: string): void => {
  if (process.env.NODE_ENV !== 'production') console.warn(message);
};

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
        props = JSON.parse(raw);
      } catch {
        onWarn(`[analytics] ignoring invalid data-track-props JSON on "${name}"`);
      }
    }

    a.trackUntyped(name, props);
  };

  root.addEventListener('click', onClick, true);
  return () => root.removeEventListener('click', onClick, true);
}
