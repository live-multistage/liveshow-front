import { config } from '@/config';

export const ORGANIZATION_APPLY_PATH = '/be-partner/apply';

export function organizerCtaHref(isLoggedIn: boolean): string {
  if (isLoggedIn) return ORGANIZATION_APPLY_PATH;
  return `/register?redirect=${encodeURIComponent(ORGANIZATION_APPLY_PATH)}`;
}

// The Ads Manager is a separate app (live-show-ads); config.adsManagerUrl
// already carries its base URL (NEXT_PUBLIC_ADS_MANAGER_URL, defaulting to
// https://ads.showon.io in production). Advertiser signup/login live there,
// not in this app, so the /be-advertiser CTAs are plain external links.
export const ADS_SIGNUP_URL = `${config.adsManagerUrl}/signup`;
export const ADS_LOGIN_URL = `${config.adsManagerUrl}/login`;
