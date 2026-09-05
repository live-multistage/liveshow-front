import { renderBrandCard, OG_SIZE } from '@/shared/og/BrandCard';
import { fetchOrganizationByParam } from '@/features/organizations/queries/get-organization.server';

export const runtime = 'edge';
export const alt = 'Organização no showon.io';
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
  const org = await fetchOrganizationByParam(slug);

  return renderBrandCard({
    eyebrow: 'ORGANIZAÇÃO',
    title: org?.name ?? 'Organização',
    subtitle: org?.description ? truncate(org.description) : undefined,
  });
}
