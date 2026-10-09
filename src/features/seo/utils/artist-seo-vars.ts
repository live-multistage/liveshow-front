import type { SeoVars } from './resolve-seo';

export function artistSeoVars(
  artist: { name: string; description?: string | null; imageUrl?: string | null },
  url: string,
): SeoVars {
  return {
    'artist.name': artist.name,
    'artist.bio': artist.description ?? '',
    'artist.imageUrl': artist.imageUrl ?? '',
    'artist.url': url,
  };
}
