import type { Metadata } from 'next';
import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';
import { OrganizationPublicPage } from '@/features/organizations';
import {
  fetchOrganizationByParam,
  fetchOrganizationEvents,
} from '@/features/organizations/queries/get-organization.server';
import { JsonLd } from '@/shared/components/JsonLd';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://showon.io';

interface Props {
  params: Promise<{ slug: string }>;
}

function toDescription(text: string | undefined, name: string): string {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim();
  if (clean) return clean.length <= 160 ? clean : `${clean.slice(0, 160).replace(/\s+\S*$/, '')}…`;
  return `Eventos, shows e transmissões ao vivo de ${name} no showon.io.`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const org = await fetchOrganizationByParam(slug);
  if (!org) return { title: 'Organização', robots: { index: false, follow: false } };

  const url = `${SITE_URL}/o/${org.slug}`;
  const description = toDescription(org.description, org.name);
  return {
    title: org.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'profile',
      url,
      title: org.name,
      description,
      images: org.bannerUrl ? [{ url: org.bannerUrl }] : undefined,
    },
  };
}

export default async function OrganizationPage({ params }: Props) {
  const { slug } = await params;
  const org = await fetchOrganizationByParam(slug);

  const qc = new QueryClient();
  if (org) {
    // Seed the queries the client component reads: org by the slug param, and
    // both event tabs by the resolved org id.
    qc.setQueryData(['organizations', slug], org);
    const [upcoming, past] = await Promise.all([
      fetchOrganizationEvents(org.id, 'upcoming'),
      fetchOrganizationEvents(org.id, 'past'),
    ]);
    qc.setQueryData(['organizations', org.id, 'events', 'upcoming'], upcoming);
    qc.setQueryData(['organizations', org.id, 'events', 'past'], past);
  }

  const orgJsonLd = org && {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: org.name,
    url: `${SITE_URL}/o/${org.slug}`,
    ...(org.description ? { description: org.description } : {}),
    ...(org.logoUrl ? { logo: org.logoUrl } : {}),
  };

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      {orgJsonLd && <JsonLd data={orgJsonLd} />}
      <OrganizationPublicPage slug={slug} />
    </HydrationBoundary>
  );
}
