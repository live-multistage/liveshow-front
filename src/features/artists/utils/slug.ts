/** Mirrors events/utils/slug.ts eventHref — one-liner, no shared abstraction. */
export function artistHref(artist: { id: string; slug?: string | null }): string {
  return `/artists/${artist.slug || artist.id}`;
}
