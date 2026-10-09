import { describe, expect, it } from 'vitest';
import { NAV_BY_ROLE } from './dashboard.types';

describe('SUPER_ADMIN nav: SEO and legal documents', () => {
  it('lists both entries in CONFIG & GOVERNANÇA before settings', () => {
    const nav = NAV_BY_ROLE.SUPER_ADMIN;
    const keys = nav.map((i) => i.navKey);
    expect(nav.find((i) => i.navKey === 'platformSeo')).toEqual(
      expect.objectContaining({ href: '/dashboard/platform/seo', group: 'CONFIG & GOVERNANÇA' }),
    );
    expect(nav.find((i) => i.navKey === 'platformLegal')).toEqual(
      expect.objectContaining({ href: '/dashboard/platform/legal', group: 'CONFIG & GOVERNANÇA' }),
    );
    expect(keys.indexOf('platformLegal')).toBeLessThan(keys.indexOf('platformSettings'));
  });

  it('keeps them away from ADMIN', () => {
    const keys = NAV_BY_ROLE.ADMIN.map((i) => i.navKey);
    expect(keys).not.toContain('platformSeo');
    expect(keys).not.toContain('platformLegal');
  });
});
