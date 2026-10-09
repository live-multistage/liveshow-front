import type { SeoVars } from './resolve-seo';

export function organizationSeoVars(
  org: { name: string; description?: string | null; logoUrl?: string | null },
  url: string,
): SeoVars {
  return {
    'organization.name': org.name,
    'organization.description': org.description ?? '',
    'organization.logoUrl': org.logoUrl ?? '',
    'organization.url': url,
  };
}
