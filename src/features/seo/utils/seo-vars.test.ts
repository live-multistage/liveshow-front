import { describe, it, expect } from 'vitest';
import { SEO_PAGE_VARIABLES, type SeoPageKey } from '@live-show/api-contracts';
import type { EventResponse } from '@/features/events/types/event.types';
import { eventSeoVars } from './event-seo-vars';
import { artistSeoVars } from './artist-seo-vars';
import { organizationSeoVars } from './organization-seo-vars';
import { channelSeoVars } from './channel-seo-vars';

// Pins the contract allowlist to what each page actually provides.
const pageVars = (key: SeoPageKey) => SEO_PAGE_VARIABLES[key].filter((k) => !k.startsWith('site.')).sort();
const keys = (vars: object) => Object.keys(vars).sort();

const event = {
  id: 'e1', slug: 's', title: 'Rock', description: 'd', startsAt: '2026-01-01T00:00:00Z',
  endsAt: null, bannerUrl: null, isFree: false, priceFromCents: 3990,
  organization: { name: 'Org' }, artists: [{ name: 'Ana', slug: 'ana' }],
} as unknown as EventResponse;

describe('seo var builders', () => {
  it('events.detail', () => {
    const vars = eventSeoVars(event, 'https://x/events/s');
    expect(keys(vars)).toEqual(pageVars('events.detail'));
    expect(vars['event.priceFrom']).toBe('39.90');
    expect(vars['artist.name']).toBe('Ana');
  });
  it('free event price is 0', () => {
    expect(eventSeoVars({ ...event, isFree: true }, 'u')['event.priceFrom']).toBe('0');
  });
  it('artists.detail', () => expect(keys(artistSeoVars({ name: 'A' }, 'u'))).toEqual(pageVars('artists.detail')));
  it('organizations.detail', () =>
    expect(keys(organizationSeoVars({ name: 'O' }, 'u'))).toEqual(pageVars('organizations.detail')));
  it('channels.detail', () => expect(keys(channelSeoVars({ name: 'C' }, 'u'))).toEqual(pageVars('channels.detail')));
});
