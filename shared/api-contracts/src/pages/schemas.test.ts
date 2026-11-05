import { describe, expect, it } from 'vitest';
import parityCases from './page-parity-cases.json';
import { PAGE_SECTION_TYPES } from './types';
import {
  createEmptyDocument,
  createEmptySection,
  createPageSchema,
  isPageHref,
  pageDocumentSchema,
  pageDraftSchema,
  pageSectionIssues,
  publishPageSchema,
  saveDraftSchema,
  updatePageSettingsSchema,
  upgradePageDocument,
} from './schemas';

const U = (n: number) => `${String(n).padStart(8, '0')}-1111-4111-8111-111111111111`;
const EV = '99999999-9999-4999-8999-999999999999';
const appearance = { background: 'default', spacing: 'normal', showOn: 'all' };
const sec = (n: number, type: string, props: unknown, extra: Record<string, unknown> = {}) => ({
  id: U(n), type, hidden: false, appearance, props, ...extra,
});
const doc = (...sections: unknown[]) => ({ schemaVersion: 1, context: { type: 'none' }, sections });
const x = (n: number) => 'x'.repeat(n);
const cta = { label: 'Ver', href: '/events' };
const items = (n: number, shape: Record<string, string>) => Array.from({ length: n }, () => ({ ...shape }));
const FEATURE = { title: 'T', text: 'Texto' };
const STEP = { title: 'T', text: 'Texto' };
const STAT = { value: '10', label: 'Eventos' };
const FAQ = { question: 'Q?', answer: 'R.' };
const PLAN = { name: 'Free', price: 'R$ 0' };

const heroWith = (props: Record<string, unknown>) => doc(sec(1, 'hero', { title: 'Oi', ...props }));
const railWith = (props: Record<string, unknown>) =>
  doc(sec(1, 'rail', { title: 'Em breve', source: { kind: 'live' }, limit: 8, ...props }));

const ALL_TYPES = doc(
  sec(1, 'hero', { eyebrow: 'Novo', title: 'Eventos ao vivo', subtitle: 'Sub', primaryCta: cta, secondaryCta: { label: 'Saiba', href: '#como-funciona' }, image: { url: 'https://x.io/a.png', alt: 'Capa' } }),
  sec(2, 'audience', { text: 'Milhares de pessoas', counters: [{ value: '10k', label: 'Fãs' }] }),
  sec(3, 'text', { title: 'Sobre', paragraphs: [[{ text: 'Olá ' }, { text: 'mundo', bold: true, href: 'https://x.io' }]] }),
  sec(4, 'features', { title: 'Recursos', items: [{ icon: 'star', ...FEATURE }, FEATURE] }),
  sec(5, 'how', { title: 'Como funciona', steps: items(3, STEP) }),
  sec(6, 'media', { kind: 'video', url: 'https://x.io/v.mp4', alt: 'Vídeo', caption: 'Legenda' }),
  sec(7, 'stats', { items: items(2, STAT) }),
  sec(8, 'rail', { title: 'Categoria', source: { kind: 'category', id: 'musica' }, limit: 4 }),
  sec(9, 'featured', { eventId: EV, ctaLabel: 'Comprar' }),
  sec(10, 'pricing', { title: 'Planos', plans: [PLAN, { ...PLAN, description: 'd', cta }] }),
  sec(11, 'faq', { title: 'Dúvidas', items: items(3, FAQ) }),
  sec(12, 'final', { title: 'Vamos?', cta }),
);

// Identical file (cmp) in live-show-orchestrator/src/pages/domain/page-parity-cases.json (B3).
const PAGE_PARITY_CASES = parityCases as Array<{ name: string; input: unknown; valid: boolean }>;

describe('PAGE_PARITY_CASES (pageDocumentSchema)', () => {
  it.each(PAGE_PARITY_CASES)('$name', ({ input, valid }) => {
    expect(pageDocumentSchema.safeParse(input).success).toBe(valid);
  });
});

describe('isPageHref', () => {
  it('accepts https, absolute path and anchor', () => {
    expect(isPageHref('https://x.io')).toBe(true);
    expect(isPageHref('/a/b?c=1')).toBe(true);
    expect(isPageHref('#a-b_1')).toBe(true);
  });
  it('rejects the rest', () => {
    for (const v of ['', '#', '#a b', '//x.io', 'http://x.io', 'javascript:alert(1)', 'mailto:a@b.c', 'x.io', `https://x.io/${x(2040)}`]) {
      expect(isPageHref(v)).toBe(false);
    }
  });
});

describe('createEmptySection / draft', () => {
  it.each(PAGE_SECTION_TYPES)('draft accepts an empty %s', (type) => {
    const section = createEmptySection(type, U(1));
    expect(section).toMatchObject({ id: U(1), type, hidden: false, appearance });
    expect(pageDraftSchema.safeParse(doc(section)).success).toBe(true);
  });

  it('document rejects an empty hero and issues point to title', () => {
    const hero = createEmptySection('hero', U(1));
    expect(pageDocumentSchema.safeParse(doc(hero)).success).toBe(false);
    expect(pageSectionIssues(hero).map((i) => i.path)).toContain('title');
  });

  it('issues use dot paths for nested fields and are empty when valid', () => {
    const section = sec(1, 'features', { title: 'T', items: [FEATURE, { title: '', text: 'a' }] }) as never;
    expect(pageSectionIssues(section)).toEqual([{ path: 'items.1.title', message: 'Obrigatório.' }]);
    expect(pageSectionIssues(sec(1, 'final', { title: 'T', cta }) as never)).toEqual([]);
  });

  it('draft keeps structural rules', () => {
    expect(pageDraftSchema.safeParse(doc(sec(1, 'hero', {}), sec(1, 'hero', {}))).success).toBe(false);
    expect(pageDraftSchema.safeParse(doc(sec(1, 'nope', {}))).success).toBe(false);
    expect(pageDraftSchema.safeParse(doc(sec(1, 'hero', 'x'))).success).toBe(false);
    expect(pageDraftSchema.safeParse(doc(sec(1, 'hero', { blob: x(300000) }))).success).toBe(false);
  });
});

describe('request schemas', () => {
  it('createPageSchema trims and explains slug errors', () => {
    expect(createPageSchema.parse({ title: '  Verão ', slug: 'verao' }).title).toBe('Verão');
    const msg = (slug: string) => {
      const r = createPageSchema.safeParse({ title: 'A', slug });
      return r.success ? null : r.error.issues[0].message;
    };
    expect(msg('Verao')).toBe('Use só letras minúsculas, números e hífen.');
    expect(msg('admin')).toBe('Esse endereço é reservado pela plataforma.');
    expect(createPageSchema.safeParse({ title: 'A', slug: 'a', duplicateFromPageId: 'x' }).success).toBe(false);
    expect(createPageSchema.safeParse({ title: 'A', slug: 'a', duplicateFromPageId: U(1) }).success).toBe(true);
  });

  it('saveDraftSchema / publishPageSchema', () => {
    expect(saveDraftSchema.safeParse({ document: doc(), baseRevision: 0 }).success).toBe(true);
    expect(saveDraftSchema.safeParse({ document: doc(), baseRevision: -1 }).success).toBe(false);
    expect(publishPageSchema.safeParse({ changeSummary: ' ', baseRevision: 1 }).success).toBe(false);
    expect(publishPageSchema.safeParse({ changeSummary: x(141), baseRevision: 1 }).success).toBe(false);
    expect(publishPageSchema.safeParse({ changeSummary: 'Novo hero', baseRevision: 1 }).success).toBe(true);
    expect(publishPageSchema.safeParse({ changeSummary: '{{x}}', baseRevision: 1 }).success).toBe(false);
  });

  it('updatePageSettingsSchema needs at least one field and validates seo', () => {
    expect(updatePageSettingsSchema.safeParse({}).success).toBe(false);
    expect(updatePageSettingsSchema.safeParse({ title: 'Novo' }).success).toBe(true);
    expect(updatePageSettingsSchema.safeParse({ seo: { noindex: true } }).success).toBe(true);
    expect(updatePageSettingsSchema.safeParse({ seo: { noindex: false, title: x(61) } }).success).toBe(false);
    expect(updatePageSettingsSchema.safeParse({ seo: { noindex: false, description: x(161) } }).success).toBe(false);
    expect(updatePageSettingsSchema.safeParse({ seo: { noindex: false, imageUrl: 'http://x.io/a.png' } }).success).toBe(false);
    expect(updatePageSettingsSchema.safeParse({ slug: 'login' }).success).toBe(false);
  });
});

describe('braces and context', () => {
  it('draft refuses {{ in text but not in hrefs', () => {
    expect(pageDraftSchema.safeParse(doc(sec(1, 'hero', { title: '{{a}}' }))).success).toBe(false);
    expect(pageDraftSchema.safeParse(doc(sec(1, 'hero', { primaryCta: { label: 'x', href: '/a?{{b}}' } }))).success).toBe(true);
    expect(pageDraftSchema.safeParse({ schemaVersion: 1, sections: [] }).success).toBe(false);
  });
  it('settings and create refuse {{', () => {
    expect(createPageSchema.safeParse({ title: '{{a}}', slug: 'a' }).success).toBe(false);
    expect(updatePageSettingsSchema.safeParse({ seo: { noindex: false, title: '{{a}}' } }).success).toBe(false);
    expect(updatePageSettingsSchema.safeParse({ seo: { noindex: false, description: '{{a}}' } }).success).toBe(false);
  });
  it('createEmptyDocument is a valid document', () => {
    expect(pageDocumentSchema.safeParse(createEmptyDocument()).success).toBe(true);
  });
});

describe('upgradePageDocument', () => {
  it('returns v1 as is and rejects other versions', () => {
    const v1 = doc();
    expect(upgradePageDocument(v1)).toBe(v1);
    expect(upgradePageDocument({ schemaVersion: 1, sections: [] })).toEqual({ schemaVersion: 1, context: { type: 'none' }, sections: [] });
    expect(() => upgradePageDocument({ schemaVersion: 2, sections: [] })).toThrow('Unsupported page schemaVersion');
    expect(() => upgradePageDocument(null)).toThrow('Unsupported page schemaVersion');
  });
});
