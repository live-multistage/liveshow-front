import { describe, it, expect } from 'vitest';
import { organizerCtaHref, ORGANIZATION_CREATE_PATH } from './constants';

describe('organizerCtaHref', () => {
  it('sends a logged-in organizer straight to the create-organization flow', () => {
    expect(organizerCtaHref(true)).toBe(ORGANIZATION_CREATE_PATH);
  });

  it('sends a logged-out visitor to register with a redirect back to create-organization', () => {
    expect(organizerCtaHref(false)).toBe('/register?redirect=%2Fdashboard%2Forganizations%2Fnew');
  });
});
