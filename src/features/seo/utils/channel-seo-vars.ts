import type { SeoVars } from './resolve-seo';

export function channelSeoVars(
  channel: { name: string; description?: string | null; coverUrl?: string | null },
  url: string,
): SeoVars {
  return {
    'channel.name': channel.name,
    'channel.description': channel.description ?? '',
    'channel.imageUrl': channel.coverUrl ?? '',
    'channel.url': url,
  };
}
