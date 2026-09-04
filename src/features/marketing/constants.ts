export const ORGANIZATION_CREATE_PATH = '/dashboard/organizations/new';

export function organizerCtaHref(isLoggedIn: boolean): string {
  if (isLoggedIn) return ORGANIZATION_CREATE_PATH;
  return `/register?redirect=${encodeURIComponent(ORGANIZATION_CREATE_PATH)}`;
}
