import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

const getSeoForPage = vi.hoisted(() => vi.fn());
vi.mock('../queries/get-seo.server', () => ({ getSeoForPage }));

import { PageJsonLd } from './PageJsonLd';

const config = { pageKey: 'about', extraJsonLd: ['{"@context":"https://schema.org","@type":"AboutPage","name":"{{site.name}}"}'], disabledGeneratedJsonLd: [], locale: null, jsonLdMode: 'COMPLEMENT' };

describe('PageJsonLd', () => {
  it('renders the admin block for a page without generated JSON-LD', async () => {
    getSeoForPage.mockResolvedValue(config);
    const { container } = render(await PageJsonLd({ pageKey: 'about', path: '/about' }));
    expect(container.querySelector('script[type="application/ld+json"]')?.textContent).toContain('"AboutPage"');
    expect(getSeoForPage).toHaveBeenCalledWith('about', '/about');
  });
  it('renders nothing for an empty or missing config', async () => {
    getSeoForPage.mockResolvedValue({ ...config, extraJsonLd: [] });
    expect(render(await PageJsonLd({ pageKey: 'about', path: '/about' })).container).toBeEmptyDOMElement();
    getSeoForPage.mockResolvedValue(null);
    expect(render(await PageJsonLd({ pageKey: 'about', path: '/about' })).container).toBeEmptyDOMElement();
  });
});
