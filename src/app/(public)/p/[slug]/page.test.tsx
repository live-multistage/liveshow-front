import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { PageDocument, PublicPage } from '@live-show/api-contracts';

const { fetchPublicPage, fetchFeatureFlags } = vi.hoisted(() => ({ fetchPublicPage: vi.fn(), fetchFeatureFlags: vi.fn() }));
vi.mock('@/features/pages-public/queries/get-public-page.server', () => ({ fetchPublicPage: (s: string) => fetchPublicPage(s) }));
vi.mock('@/features/feature-flags', () => ({ fetchFeatureFlags: () => fetchFeatureFlags() }));
const notFound = vi.fn(() => { throw new Error('NOT_FOUND'); });
vi.mock('next/navigation', () => ({ notFound: () => notFound() }));

import PublicPageRoute, { generateMetadata } from './page';

const page = (seo: Partial<PublicPage['seo']> = {}): PublicPage => ({
  slug: 'ola', title: 'Olá', seo: { noindex: false, ...seo }, publishedAt: '2026-01-01', version: 1,
  document: { schemaVersion: 2, context: { type: 'none' }, root: { props: {} }, content: [] },
  resolved: { rails: {}, featured: {} },
});
const params = (slug = 'ola') => ({ params: Promise.resolve({ slug }) });

beforeEach(() => {
  vi.clearAllMocks();
  fetchFeatureFlags.mockResolvedValue({ page_builder: true });
});

describe('/p/[slug]', () => {
  it('404s when the page does not exist', async () => {
    fetchPublicPage.mockResolvedValue(null);
    await expect(PublicPageRoute(params())).rejects.toThrow('NOT_FOUND');
  });
  it('404s when the page_builder flag is off', async () => {
    fetchFeatureFlags.mockResolvedValue({ page_builder: false });
    fetchPublicPage.mockResolvedValue(page());
    await expect(PublicPageRoute(params())).rejects.toThrow('NOT_FOUND');
  });
  it('renders when flag on and page exists', async () => {
    fetchPublicPage.mockResolvedValue(page());
    render(await PublicPageRoute(params()));
    expect(screen.getByRole('heading', { level: 1, name: 'Olá' })).toBeTruthy();
  });
  it('upgrades a v1 document and uses its hero as the single h1', async () => {
    const v1: PageDocument = {
      schemaVersion: 1, context: { type: 'none' },
      sections: [{
        id: '00000001-1111-4111-8111-111111111111', type: 'hero', hidden: false,
        appearance: { background: 'default', spacing: 'normal', showOn: 'all' },
        props: { title: 'Eventos ao vivo' },
      }],
    };
    fetchPublicPage.mockResolvedValue({ ...page(), document: v1 as never });
    render(await PublicPageRoute(params()));
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Eventos ao vivo' })).toBeTruthy();
  });
  it('maps rail data keyed by v1 section id to the converted rail', async () => {
    const sid = '00000002-1111-4111-8111-111111111111';
    const v1: PageDocument = {
      schemaVersion: 1, context: { type: 'none' },
      sections: [{
        id: sid, type: 'rail', hidden: false,
        appearance: { background: 'default', spacing: 'normal', showOn: 'all' },
        props: { title: 'Categoria', source: { kind: 'category', id: 'musica' }, limit: 4 },
      }],
    };
    fetchPublicPage.mockResolvedValue({
      ...page(), document: v1 as never,
      resolved: { rails: { [sid]: [{ id: 'e1', title: 'Evento Z', posterUrl: null, startsAt: null, isLive: false }] }, featured: {} },
    });
    render(await PublicPageRoute(params()));
    expect(screen.getByText('Evento Z')).toBeTruthy();
    expect(screen.getAllByText('Categoria')).toHaveLength(1);
  });
  it('metadata: seo fields, canonical and image', async () => {
    fetchPublicPage.mockResolvedValue(page({ title: 'SEO T', description: 'Desc', imageUrl: 'https://x.io/o.png' }));
    const m = await generateMetadata(params());
    expect(m.title).toBe('SEO T');
    expect(m.description).toBe('Desc');
    expect(m.alternates?.canonical).toMatch(/\/p\/ola$/);
    expect(JSON.stringify(m.openGraph)).toContain('https://x.io/o.png');
    expect(m.robots).toBeUndefined();
  });
  it('metadata: falls back to page title, noindex from seo', async () => {
    fetchPublicPage.mockResolvedValue(page({ noindex: true }));
    const m = await generateMetadata(params());
    expect(m.title).toBe('Olá');
    expect(m.robots).toEqual({ index: false, follow: false });
  });
  it('metadata: noindex when missing or flag off', async () => {
    fetchPublicPage.mockResolvedValue(null);
    expect((await generateMetadata(params())).robots).toEqual({ index: false, follow: false });
    fetchFeatureFlags.mockResolvedValue({ page_builder: false });
    fetchPublicPage.mockResolvedValue(page());
    expect((await generateMetadata(params())).robots).toEqual({ index: false, follow: false });
  });
});
