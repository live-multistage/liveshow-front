import { describe, it, expect } from 'vitest';
import { organizerCtaHref, ORGANIZATION_APPLY_PATH } from './constants';

describe('organizerCtaHref', () => {
  it('sends a logged-in organizer to the public apply flow', () => {
    expect(organizerCtaHref(true)).toBe(ORGANIZATION_APPLY_PATH);
  });

  it('sends a logged-out visitor to register with a redirect back to the apply flow', () => {
    expect(organizerCtaHref(false)).toBe('/register?redirect=%2Fbe-partner%2Fapply');
  });
});
