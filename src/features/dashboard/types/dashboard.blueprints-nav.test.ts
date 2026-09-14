import { describe, expect, it } from 'vitest';
import { NAV_BY_ROLE } from './dashboard.types';

describe('SUPER_ADMIN nav: Blueprints', () => {
  // D10: authoring/publishing happens while the flag is OFF, so the entry is not flag-gated.
  it('links to /dashboard/platform/blueprints regardless of the blueprints flag', () => {
    const item = NAV_BY_ROLE.SUPER_ADMIN.find((i) => i.navKey === 'platformBlueprints');
    expect(item).toEqual(expect.objectContaining({ href: '/dashboard/platform/blueprints' }));
    expect(item?.flag).toBeUndefined();
  });
});
