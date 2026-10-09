import { SEO_PAGE_KEYS, type SeoFields, type SeoPageKey } from '@live-show/api-contracts';

export const TITLE_MAX = 60;
export const DESCRIPTION_MAX = 160;
export const MAX_JSONLD_BLOCKS = 5;

export type Tri = 'default' | 'yes' | 'no';

// Editable shape of SeoFields: text inputs hold '' for "unset", the 3-state controls hold Tri.
export interface SeoForm {
  title: string;
  description: string;
  ogImage: string;
  index: Tri;
  follow: Tri;
  disabledGenerated: string[];
  blocks: string[];
}

export const EMPTY_FORM: SeoForm = {
  title: '',
  description: '',
  ogImage: '',
  index: 'default',
  follow: 'default',
  disabledGenerated: [],
  blocks: [],
};

const triOf = (value: boolean | null): Tri => (value === null ? 'default' : value ? 'yes' : 'no');
const boolOf = (tri: Tri): boolean | null => (tri === 'default' ? null : tri === 'yes');

export const toForm = (fields: SeoFields): SeoForm => ({
  title: fields.titleTemplate ?? '',
  description: fields.descriptionTemplate ?? '',
  ogImage: fields.ogImageUrl ?? '',
  index: triOf(fields.robotsIndex),
  follow: triOf(fields.robotsFollow),
  disabledGenerated: fields.disabledGeneratedJsonLd,
  blocks: fields.extraJsonLd,
});

// Cleared text fields become null: that is how the API un-sets a field (PUT replaces).
export const toFields = (form: SeoForm): SeoFields => ({
  titleTemplate: form.title.trim() || null,
  descriptionTemplate: form.description.trim() || null,
  ogImageUrl: form.ogImage.trim() || null,
  robotsIndex: boolOf(form.index),
  robotsFollow: boolOf(form.follow),
  disabledGeneratedJsonLd: form.disabledGenerated,
  extraJsonLd: form.blocks,
});

export const isSeoCustomized = (fields: SeoFields): boolean => {
  const f = toFields(toForm(fields));
  return (
    f.titleTemplate !== null ||
    f.descriptionTemplate !== null ||
    f.ogImageUrl !== null ||
    f.robotsIndex !== null ||
    f.robotsFollow !== null ||
    f.disabledGeneratedJsonLd.length > 0 ||
    f.extraJsonLd.length > 0
  );
};

export const sameForm = (a: SeoForm, b: SeoForm): boolean => JSON.stringify(a) === JSON.stringify(b);

export const isHttpsUrl = (value: string): boolean => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

// Route patterns are technical identifiers (shown in mono), not translated copy.
export const PAGE_ROUTES: Record<SeoPageKey, string> = {
  home: '/',
  'events.list': '/events',
  'events.detail': '/events/:slug',
  'artists.list': '/artists',
  'artists.detail': '/artists/:slug',
  'artists.apply': '/artists/apply',
  'organizations.detail': '/o/:slug',
  'channels.list': '/channels',
  'channels.detail': '/channels/:slug',
  about: '/about',
  help: '/help',
  'be-partner': '/be-partner',
  'be-partner.apply': '/be-partner/apply',
  'be-advertiser': '/be-advertiser',
  'legal.privacy': '/privacidade',
  'legal.terms': '/termos',
};

// Dots nest in message files, so keys like `be-partner.apply` are flattened with `_`.
export const pageNameKey = (key: SeoPageKey): string => key.replace(/\./g, '_');

export const isPageKey = (value: string): value is SeoPageKey => (SEO_PAGE_KEYS as readonly string[]).includes(value);

const VARIABLE = /\{\{\s*([\w.]+)\s*\}\}/g;

export const fillVariables = (template: string, valueOf: (name: string) => string): string =>
  template.replace(VARIABLE, (_, name: string) => valueOf(name));

export const formatJson = (raw: string): string => {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
};
