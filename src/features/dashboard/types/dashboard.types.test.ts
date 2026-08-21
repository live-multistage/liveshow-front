import { describe, it, expect } from 'vitest';
import { MOBILE_NAV_BY_ROLE, NAV_BY_ROLE } from './dashboard.types';

describe('MOBILE_NAV_BY_ROLE', () => {
  it('keeps analytics in reach on mobile for ADMIN and ORGANIZER', () => {
    expect(MOBILE_NAV_BY_ROLE.ADMIN).toContain('analytics');
    expect(MOBILE_NAV_BY_ROLE.ORGANIZER).toContain('analytics');
  });

  it.each(Object.keys(MOBILE_NAV_BY_ROLE) as (keyof typeof MOBILE_NAV_BY_ROLE)[])(
    '%s fits the 5-slot bottom bar and only names real nav keys',
    (role) => {
      const keys = MOBILE_NAV_BY_ROLE[role];
      expect(keys.length).toBeLessThanOrEqual(5);
      const known = NAV_BY_ROLE[role].map((item) => item.navKey);
      expect(keys.filter((key) => !known.includes(key))).toEqual([]);
    },
  );
});
