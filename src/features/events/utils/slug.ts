// Port of live-show-orchestrator `src/shared/utils/slugify.ts`. Kept byte-for-byte
// equivalent so the dashboard preview shows exactly what the backend will store —
// a divergence here would render a URL that 404s the moment it's saved.
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const SLUG_MAX_LENGTH = 120;
export const SLUG_MIN_LENGTH = 3;

export function slugify(value: string, maxLength: number = SLUG_MAX_LENGTH): string {
  return (
    value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, maxLength)
      // A cut mid-word can leave a trailing dash — trim again after slicing.
      .replace(/-+$/g, '')
  );
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The public event segment accepts both; this is how it tells them apart. */
export function isEventId(param: string): boolean {
  return UUID_PATTERN.test(param);
}

/**
 * The single source of truth for "link to this event's public page".
 * Every payload that carries an event narrows to this shape, and the ones whose
 * backend route doesn't project `slug` yet fall back to the id — which still
 * resolves, since the page redirects id → slug.
 */
export function eventHref(event: { id: string; slug?: string | null }): string {
  return `/events/${event.slug || event.id}`;
}
