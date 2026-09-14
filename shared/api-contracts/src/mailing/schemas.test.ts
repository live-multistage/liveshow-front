import { describe, expect, it } from 'vitest';
import { MAILING_AUDIENCE_TYPES } from './types';
import {
  isHttpsUrl,
  mailingAudienceSchema,
  mailingPreviewRequestSchema,
  mailingTemplateDraftSchema,
  mailingTextLength,
} from './schemas';

const U1 = '11111111-1111-4111-8111-111111111111';
const U2 = '22222222-2222-4222-8222-222222222222';
const U3 = '33333333-3333-4333-8333-333333333333';
const U4 = '44444444-4444-4444-8444-444444444444';
const KEY = `mailing/${U1}.png`;
const base = { name: 'Promo', category: 'MARKETING', subject: 'Olá {{nome}}', preheader: 'Novidades', language: 'pt' };
const withBlocks = (...blocks: unknown[]) => ({ ...base, blocks });

// PARITY_CASES — identical array in live-show-orchestrator/src/mailing/domain/template-content.spec.ts (R2).
const PARITY_CASES: Array<[string, unknown, boolean]> = [
  ['every block type', withBlocks(
    { type: 'heading', text: 'Oi {{nome}}', size: 'lg' },
    { type: 'text', paragraphs: [[{ text: 'Veja ' }, { text: 'isto', bold: true, href: 'https://showon.io/x' }]] },
    { type: 'image', assetKey: KEY, alt: 'Poster', href: 'https://showon.io' },
    { type: 'button', label: 'Comprar', href: 'https://showon.io/events/a' },
    { type: 'eventCard', eventId: U1, badge: 'NOVO', ctaLabel: 'Ver' },
    { type: 'eventList', eventIds: [U1, U2, U3] },
    { type: 'divider' },
  ), true],
  ['no blocks', withBlocks(), true],
  ['31 blocks', withBlocks(...Array.from({ length: 31 }, () => ({ type: 'divider' }))), false],
  ['heading 121 chars', withBlocks({ type: 'heading', text: 'x'.repeat(121), size: 'md' }), false],
  ['text exactly 2000 chars', withBlocks({ type: 'text', paragraphs: [[{ text: 'x'.repeat(1000) }], [{ text: 'y'.repeat(1000) }]] }), true],
  ['text 2001 chars', withBlocks({ type: 'text', paragraphs: [[{ text: 'x'.repeat(2001) }]] }), false],
  ['empty run text', withBlocks({ type: 'text', paragraphs: [[{ text: '' }]] }), false],
  ['button label 61 chars', withBlocks({ type: 'button', label: 'x'.repeat(61), href: 'https://showon.io' }), false],
  ['http href', withBlocks({ type: 'button', label: 'Ir', href: 'http://showon.io' }), false],
  ['javascript href', withBlocks({ type: 'button', label: 'Ir', href: 'javascript:alert(1)' }), false],
  ['2049-char url', withBlocks({ type: 'button', label: 'Ir', href: `https://showon.io/${'a'.repeat(2031)}` }), false],
  ['foreign asset key', withBlocks({ type: 'image', assetKey: `avatars/${U1}.png`, alt: '' }), false],
  ['4 events in a list', withBlocks({ type: 'eventList', eventIds: [U1, U2, U3, U4] }), false],
  ['empty event list', withBlocks({ type: 'eventList', eventIds: [] }), false],
  ['non-uuid event', withBlocks({ type: 'eventCard', eventId: 'abc' }), false],
  ['eventCard bound to the blueprint context', withBlocks({ type: 'eventCard', eventId: 'context' }), true],
  ['eventCard with an invalid eventId', withBlocks({ type: 'eventCard', eventId: 'nope' }), false],
  ['unknown block type', withBlocks({ type: 'html', html: '<b>x</b>' }), false],
  ['extra block property', withBlocks({ type: 'divider', html: '<b>x</b>' }), false],
  ['subject 151 chars', { ...base, subject: 'x'.repeat(151), blocks: [] }, false],
  ['preheader 201 chars', { ...base, preheader: 'x'.repeat(201), blocks: [] }, false],
  ['unknown language', { ...base, language: 'fr', blocks: [] }, false],
];

describe('mailingTemplateDraftSchema (parity with backend validateTemplateDraft)', () => {
  it.each(PARITY_CASES)('%s', (_name, input, valid) => {
    expect(mailingTemplateDraftSchema.safeParse(input).success).toBe(valid);
  });
});

describe('mailingPreviewRequestSchema', () => {
  it('does not require a name', () => {
    const { name: _omit, ...rest } = base;
    expect(mailingPreviewRequestSchema.safeParse({ ...rest, blocks: [] }).success).toBe(true);
  });
});

describe('mailingAudienceSchema', () => {
  it.each<[unknown, boolean]>([
    [{ type: 'ALL_VERIFIED' }, true],
    [{ type: 'ALL_VERIFIED', country: 'BR' }, true],
    [{ type: 'ALL_VERIFIED', country: 'br' }, false],
    [{ type: 'EVENT_BUYERS', eventId: U1 }, true],
    [{ type: 'EVENT_BUYERS' }, false],
    [{ type: 'EVENT_SAVERS', eventId: U1, country: 'PT' }, true],
    [{ type: 'CHANNEL_SUBSCRIBERS', channelId: U2 }, true],
    [{ type: 'CHANNEL_SUBSCRIBERS', eventId: U2 }, false],
    [{ type: 'EVERYONE' }, false],
  ])('%j → %s', (input, valid) => {
    expect(mailingAudienceSchema.safeParse(input).success).toBe(valid);
  });
});

describe('mailingAudienceSchema — new audience types', () => {
  it.each<[unknown, boolean]>([
    [{ type: 'EVENT_BUYERS_NOT_WATCHED', eventId: U1 }, true],
    [{ type: 'EVENT_BUYERS_NOT_WATCHED' }, false],
    [{ type: 'ORG_BUYERS', organizationId: U1 }, true],
    [{ type: 'ORG_BUYERS' }, false],
    [{ type: 'ARTIST_BUYERS', artistId: U1 }, true],
    [{ type: 'ARTIST_BUYERS' }, false],
    [{ type: 'CATEGORY_BUYERS', eventCategory: 'MUSIC' }, true],
    [{ type: 'CATEGORY_BUYERS', eventCategory: 'NOT_A_CATEGORY' }, false],
    [{ type: 'ABANDONED_CARTS', olderThanHours: 24 }, true],
    [{ type: 'ABANDONED_CARTS', olderThanHours: 0 }, false],
    [{ type: 'ABANDONED_CARTS', olderThanHours: 721 }, false],
    [{ type: 'PENDING_ORDERS', olderThanHours: 1 }, true],
    [{ type: 'PENDING_ORDERS', olderThanHours: 169 }, false],
    [{ type: 'COUPON_USERS', couponCode: 'PROMO10' }, true],
    [{ type: 'COUPON_USERS', couponCode: '' }, false],
    [{ type: 'COUPON_USERS', couponCode: 'x'.repeat(65) }, false],
    [{ type: 'REFUNDED_BUYERS' }, true],
    [{ type: 'REFUNDED_BUYERS', eventId: U1 }, false],
    [{ type: 'NEVER_PURCHASED', minAccountAgeDays: 30 }, true],
    [{ type: 'NEVER_PURCHASED', minAccountAgeDays: -1 }, false],
    [{ type: 'NEVER_PURCHASED', minAccountAgeDays: 3651 }, false],
    [{ type: 'REPEAT_BUYERS', minEvents: 3 }, true],
    [{ type: 'REPEAT_BUYERS', minEvents: 1 }, false],
    [{ type: 'REPEAT_BUYERS', minEvents: 101 }, false],
    [{ type: 'INACTIVE_USERS', days: 60 }, true],
    [{ type: 'INACTIVE_USERS', days: 6 }, false],
    [{ type: 'CHANNEL_EXPIRING', withinDays: 7 }, true],
    [{ type: 'CHANNEL_EXPIRING', channelId: U1, withinDays: 7 }, true],
    [{ type: 'CHANNEL_EXPIRING', withinDays: 91 }, false],
    [{ type: 'CHANNEL_CHURNED' }, true],
    [{ type: 'CHANNEL_CHURNED', channelId: U1 }, true],
    [{ type: 'FREE_ONLY_VIEWERS' }, true],
    [{ type: 'APP_USERS' }, true],
    [{ type: 'NO_APP_USERS' }, true],
    [{ type: 'ORG_MEMBERS' }, true],
    [{ type: 'ORG_MEMBERS', organizationId: U1 }, true],
    [{ type: 'ORG_MEMBERS_INACTIVE', days: 60 }, true],
    [{ type: 'ORG_MEMBERS_INACTIVE', days: 731 }, false],
    [{ type: 'APPLICANTS', applicationKind: 'ORGANIZER', applicationStatus: 'PENDING' }, true],
    [{ type: 'APPLICANTS', applicationKind: 'ARTIST', applicationStatus: 'APPROVED' }, true],
    [{ type: 'APPLICANTS', applicationKind: 'NOT_A_KIND', applicationStatus: 'PENDING' }, false],
    [{ type: 'APPLICANTS', applicationKind: 'ARTIST' }, false],
    [{ type: 'ADVERTISERS' }, true],
    [{ type: 'ARTIST_OWNERS' }, true],
    [{ type: 'ARTIST_FOLLOWERS', artistId: U1 }, true],
    [{ type: 'ARTIST_FOLLOWERS' }, false],
    [{ type: 'ORG_FOLLOWERS', organizationId: U1 }, true],
    [{ type: 'ORG_FOLLOWERS' }, false],
  ])('%j → %s', (input, valid) => {
    expect(mailingAudienceSchema.safeParse(input).success).toBe(valid);
  });
});

describe('MAILING_AUDIENCE_TYPES pin list', () => {
  it('matches the plan list exactly, in order', () => {
    expect(MAILING_AUDIENCE_TYPES).toEqual([
      'ALL_VERIFIED',
      'EVENT_BUYERS',
      'EVENT_SAVERS',
      'CHANNEL_SUBSCRIBERS',
      'EVENT_BUYERS_NOT_WATCHED',
      'ORG_BUYERS',
      'ARTIST_BUYERS',
      'CATEGORY_BUYERS',
      'ABANDONED_CARTS',
      'PENDING_ORDERS',
      'COUPON_USERS',
      'REFUNDED_BUYERS',
      'NEVER_PURCHASED',
      'REPEAT_BUYERS',
      'INACTIVE_USERS',
      'CHANNEL_EXPIRING',
      'CHANNEL_CHURNED',
      'FREE_ONLY_VIEWERS',
      'APP_USERS',
      'NO_APP_USERS',
      'ORG_MEMBERS',
      'ORG_MEMBERS_INACTIVE',
      'APPLICANTS',
      'ADVERTISERS',
      'ARTIST_OWNERS',
      'ARTIST_FOLLOWERS',
      'ORG_FOLLOWERS',
    ]);
  });
});

describe('helpers', () => {
  it('isHttpsUrl accepts only https', () => {
    expect(isHttpsUrl('https://showon.io')).toBe(true);
    expect(isHttpsUrl('http://showon.io')).toBe(false);
    expect(isHttpsUrl('not a url')).toBe(false);
  });
  it('mailingTextLength sums every run', () => {
    expect(mailingTextLength([[{ text: 'ab' }, { text: 'c' }], [{ text: 'de' }]])).toBe(5);
  });
});
