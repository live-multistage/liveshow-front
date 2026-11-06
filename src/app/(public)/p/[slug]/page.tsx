import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadPublishedPage } from '@/features/pages-public/queries/load-published-page.server';
import { PageSections } from '@/features/pages-public/sections';
import styles from './page.module.scss';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://showon.io';
const NOINDEX: Metadata = { robots: { index: false, follow: false } };

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await loadPublishedPage(slug);
  if (!page) return { title: 'Página', ...NOINDEX };

  const title = page.seo.title || page.title;
  const description = page.seo.description;
  const url = `${SITE_URL}/p/${page.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    // Without seo.imageUrl, `images` stays unset so the co-located opengraph-image.tsx card is used.
    openGraph: { type: 'website', url, title, description, ...(page.seo.imageUrl ? { images: [page.seo.imageUrl] } : {}) },
    ...(page.seo.noindex ? NOINDEX : {}),
  };
}

export default async function PublicPageRoute({ params }: Props) {
  const { slug } = await params;
  const page = await loadPublishedPage(slug);
  if (!page) notFound();
  return (
    <main>
      <h1 className={styles.title}>{page.title}</h1>
      <PageSections document={page.document} resolved={page.resolved} />
    </main>
  );
}
