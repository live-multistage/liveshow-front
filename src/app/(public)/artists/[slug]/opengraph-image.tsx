import { renderBrandCard, OG_SIZE } from '@/shared/og/BrandCard';
import { fetchArtistByParam } from '@/features/artists/queries/get-artist.server';

export const runtime = 'edge';
export const alt = 'Artista no showon.io';
export const size = OG_SIZE;
export const contentType = 'image/png';

interface Props {
  params: Promise<{ slug: string }>;
}

function truncate(text: string, max = 140): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).replace(/\s+\S*$/, '')}…`;
}

export default async function OpengraphImage({ params }: Props) {
  const { slug } = await params;
  const artist = await fetchArtistByParam(slug);

  return renderBrandCard({
    eyebrow: 'ARTISTA',
    title: artist?.name ?? 'Artista',
    subtitle: artist?.description ? truncate(artist.description) : undefined,
  });
}
