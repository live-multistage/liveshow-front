export const SEO_PAGE_KEYS = [
  'home', 'events.list', 'events.detail', 'artists.list', 'artists.detail', 'artists.apply',
  'organizations.detail', 'channels.list', 'channels.detail', 'about', 'help',
  'be-partner', 'be-partner.apply', 'be-advertiser', 'legal.privacy', 'legal.terms',
] as const;

export type SeoPageKey = (typeof SEO_PAGE_KEYS)[number];

const SITE = ['site.name', 'site.url'] as const;

export const SEO_PAGE_VARIABLES: Record<SeoPageKey, readonly string[]> = {
  home: SITE,
  'events.list': SITE,
  'events.detail': [
    ...SITE, 'event.name', 'event.description', 'event.startsAt', 'event.endsAt', 'event.imageUrl',
    'event.url', 'event.priceFrom', 'organization.name', 'artist.name',
  ],
  'artists.list': SITE,
  'artists.detail': [...SITE, 'artist.name', 'artist.bio', 'artist.imageUrl', 'artist.url'],
  'artists.apply': SITE,
  'organizations.detail': [...SITE, 'organization.name', 'organization.description', 'organization.logoUrl', 'organization.url'],
  'channels.list': SITE,
  'channels.detail': [...SITE, 'channel.name', 'channel.description', 'channel.imageUrl', 'channel.url'],
  about: SITE,
  help: SITE,
  'be-partner': SITE,
  'be-partner.apply': SITE,
  'be-advertiser': SITE,
  'legal.privacy': SITE,
  'legal.terms': SITE,
};

// @type values of the blocks the web generates in code for each page; admins may disable these.
export const GENERATED_JSONLD_TYPES: Record<SeoPageKey, readonly string[]> = {
  home: [],
  'events.list': [],
  'events.detail': ['Event', 'BreadcrumbList'],
  'artists.list': [],
  'artists.detail': ['Person', 'BreadcrumbList'],
  'artists.apply': [],
  'organizations.detail': ['Organization', 'BreadcrumbList'],
  'channels.list': [],
  'channels.detail': ['BroadcastService', 'BreadcrumbList'],
  about: [],
  help: [],
  'be-partner': [],
  'be-partner.apply': [],
  'be-advertiser': [],
  'legal.privacy': [],
  'legal.terms': [],
};

// Lowercase, no query/hash, single slashes, no trailing slash except root.
export function normalizeSeoPath(path: string): string {
  const bare = path.split(/[?#]/)[0].toLowerCase().replace(/\/{2,}/g, '/');
  const withLead = bare.startsWith('/') ? bare : `/${bare}`;
  return withLead.length > 1 ? withLead.replace(/\/+$/, '') || '/' : '/';
}

const STATIC_PATHS: Record<string, SeoPageKey> = {
  '/': 'home',
  '/events': 'events.list',
  '/artists': 'artists.list',
  '/artists/apply': 'artists.apply',
  '/channels': 'channels.list',
  '/about': 'about',
  '/help': 'help',
  '/be-partner': 'be-partner',
  '/be-partner/apply': 'be-partner.apply',
  '/be-advertiser': 'be-advertiser',
  '/privacidade': 'legal.privacy',
  '/termos': 'legal.terms',
};

const DYNAMIC_PATHS: [RegExp, SeoPageKey][] = [
  [/^\/events\/[^/]+$/, 'events.detail'],
  [/^\/artists\/[^/]+$/, 'artists.detail'],
  [/^\/o\/[^/]+$/, 'organizations.detail'],
  [/^\/channels\/[^/]+$/, 'channels.detail'],
];

export function pageKeyForPath(path: string): SeoPageKey | null {
  const normalized = normalizeSeoPath(path);
  const fixed = STATIC_PATHS[normalized];
  if (fixed) return fixed;
  return DYNAMIC_PATHS.find(([pattern]) => pattern.test(normalized))?.[1] ?? null;
}
