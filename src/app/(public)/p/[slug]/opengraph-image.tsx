import { renderBrandCard, OG_SIZE } from '@/shared/og/BrandCard';
import { loadPublishedPage } from '@/features/pages-public/queries/load-published-page.server';

export const runtime = 'nodejs';
export const alt = 'Página no showon.io';
export const size = OG_SIZE;
export const contentType = 'image/png';

interface Props {
  params: Promise<{ slug: string }>;
}

// Missing page or flag off: generic brand card, nothing about the page leaks.
export default async function OpengraphImage({ params }: Props) {
  const { slug } = await params;
  const page = await loadPublishedPage(slug);
  if (!page) return renderBrandCard({ title: 'Eventos ao vivo de todo o mundo', subtitle: 'na palma da sua mão.' });
  return renderBrandCard({ title: page.title, subtitle: page.seo.description });
}
