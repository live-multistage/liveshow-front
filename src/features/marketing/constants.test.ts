import { describe, it, expect } from 'vitest';
import { config } from '@/config';
import { organizerCtaHref, ORGANIZATION_APPLY_PATH, ADS_SIGNUP_URL, ADS_LOGIN_URL } from './constants';

describe('ads manager links', () => {
  it('builds signup/login off config.adsManagerUrl', () => {
    expect(ADS_SIGNUP_URL).toBe(`${config.adsManagerUrl}/signup`);
    expect(ADS_LOGIN_URL).toBe(`${config.adsManagerUrl}/login`);
  });
});

describe('organizerCtaHref', () => {
  it('sends a logged-in organizer to the public apply flow', () => {
    expect(organizerCtaHref(true)).toBe(ORGANIZATION_APPLY_PATH);
  });

  it('sends a logged-out visitor to register with a redirect back to the apply flow', () => {
    expect(organizerCtaHref(false)).toBe('/register?redirect=%2Fbe-partner%2Fapply');
  });
});
