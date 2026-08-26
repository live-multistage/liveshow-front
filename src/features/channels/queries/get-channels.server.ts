import { cache } from 'react';
import type { ChannelListItem, PublicChannel } from '../types/channel.types';

// Server-side fetch: native fetch, not the axios httpClient (which is
// 'use client' and carries browser-only auth interceptors). Public endpoint —
// no Authorization header needed. Mirrors get-feed.server.ts.
const apiBase = () =>
  (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api').replace(/\/$/, '');

// Revalida a cada 30s: `isOnAir`/`current` mudam com a grade, mas um trilho
// da home não justifica um fetch por request. Nunca lança — canal fora do ar
// não pode derrubar a home.
export const fetchChannels = cache(async (): Promise<ChannelListItem[]> => {
  try {
    const res = await fetch(`${apiBase()}/channels`, { next: { revalidate: 30 } });
    if (!res.ok) return [];
    return (await res.json()) as ChannelListItem[];
  } catch {
    return [];
  }
});

// Channel detail for SSR content + generateMetadata. The viewer-specific
// playback/access is left to the client (it depends on auth); this is the
// public channel shape (name, description, cover, current/next). Never throws.
export const fetchChannelBySlug = cache(async (slug: string): Promise<PublicChannel | null> => {
  try {
    const res = await fetch(`${apiBase()}/channels/${slug}`, { next: { revalidate: 30 } });
    if (!res.ok) return null;
    return (await res.json()) as PublicChannel;
  } catch {
    return null;
  }
});
