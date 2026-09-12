import { describe, expect, it } from 'vitest';
import { NAV_BY_ROLE } from './dashboard.types';

describe('SUPER_ADMIN nav: E-mails', () => {
  it('links to /dashboard/platform/mailing and hides behind the mailing flag', () => {
    const item = NAV_BY_ROLE.SUPER_ADMIN.find((i) => i.navKey === 'platformMailing');
    expect(item).toEqual(expect.objectContaining({ href: '/dashboard/platform/mailing', flag: 'mailing' }));
  });
});
