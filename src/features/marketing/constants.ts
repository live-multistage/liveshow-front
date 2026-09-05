export const ORGANIZATION_APPLY_PATH = '/be-partner/apply';

export function organizerCtaHref(isLoggedIn: boolean): string {
  if (isLoggedIn) return ORGANIZATION_APPLY_PATH;
  return `/register?redirect=${encodeURIComponent(ORGANIZATION_APPLY_PATH)}`;
}
