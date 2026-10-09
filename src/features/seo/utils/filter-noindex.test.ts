import { describe, expect, it } from 'vitest';
import { filterNoindex } from './filter-noindex';

const SITE = 'https://showon.io';
const entries = [
  { url: `${SITE}/` }, { url: `${SITE}/help` }, { url: `${SITE}/events/a` }, { url: `${SITE}/events/b` },
];

describe('filterNoindex', () => {
  it('keeps everything when noindex is null', () => expect(filterNoindex(entries, null, SITE)).toEqual(entries));

  it('drops override paths and whole noindex page keys', () =>
    expect(filterNoindex(entries, { paths: ['/events/a'], pageKeys: ['help'] }, SITE).map((e) => e.url))
      .toEqual([`${SITE}/`, `${SITE}/events/b`]));

  it('matches paths case/trailing-slash insensitively', () =>
    expect(filterNoindex([{ url: `${SITE}/Events/A/` }], { paths: ['/events/a'], pageKeys: [] }, SITE)).toEqual([]));
});
