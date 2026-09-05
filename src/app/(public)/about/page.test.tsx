import { describe, it, expect, vi } from 'vitest';

const MESSAGES: Record<string, string> = {
  'meta.title': 'Sobre',
  'meta.description': 'Uma plataforma para quem produz e para quem assiste.',
};

vi.mock('next-intl/server', () => ({
  getTranslations: async () => (key: string) => MESSAGES[key] ?? key,
}));

vi.mock('@/features/marketing/components/about/AboutPageContent', () => ({ AboutPageContent: () => null }));

import { generateMetadata } from './page';

describe('/about metadata', () => {
  it('sets matching openGraph and twitter metadata', async () => {
    const meta = await generateMetadata();

    expect(meta.title).toBe(MESSAGES['meta.title']);
    expect(meta.openGraph?.title).toBe(meta.title);
    expect(meta.openGraph?.url).toBe('/about');
    expect(meta.twitter && 'card' in meta.twitter && meta.twitter.card).toBe('summary_large_image');
  });
});
