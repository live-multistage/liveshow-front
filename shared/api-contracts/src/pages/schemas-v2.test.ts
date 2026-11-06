import { describe, expect, it } from 'vitest';
import parityCases from './page-parity-cases-v2.json';
import {
  pageDocumentReadSchema,
  pageDocumentV2Schema,
  pageDraftReadSchema,
  pageDraftV2Schema,
  saveDraftSchema,
  isPageVideoUrl,
  pageVideoEmbed,
  parsePageInlineText,
  isPageInlineTextValid,
  validatePageTreeV2,
} from './schemas-v2';
import { createEmptyDocument } from './schemas';
import type { PageDocumentV2 } from './document-v2';

const U = (n: number) => `${String(n).padStart(8, '0')}-3333-4333-8333-333333333333`;
const el = (n: number, type: string, props: Record<string, unknown> = {}) => ({ type, props: { id: U(n), ...props } });
const doc = (...content: unknown[]) => ({ schemaVersion: 2, context: { type: 'none' }, root: { props: {} }, content });

// Identical file (cmp) is consumed by the orchestrator mirror validator.
const CASES = parityCases as Array<{ name: string; input: unknown; valid: boolean; mode?: 'draft' }>;

describe('page-parity-cases-v2 (pageDocumentV2Schema)', () => {
  it('covers valid and invalid documents', () => {
    expect(CASES.some((c) => c.valid)).toBe(true);
    expect(CASES.filter((c) => !c.valid).length).toBeGreaterThan(40);
  });

  it('has draft cases', () => {
    expect(CASES.filter((c) => c.mode === 'draft').length).toBeGreaterThanOrEqual(4);
  });

  it.each(CASES)('$name', ({ input, valid, mode }) => {
    const schema = mode === 'draft' ? pageDraftV2Schema : pageDocumentV2Schema;
    expect(schema.safeParse(input).success).toBe(valid);
  });
});

describe('validatePageTreeV2 issues', () => {
  const heading = (n: number, props: Record<string, unknown> = {}) => el(n, 'heading', { text: 'Oi', tag: 'h2', ...props });

  it('points at the element path and id', () => {
    const tree = doc({ ...el(1, 'section'), props: { id: U(1), items: [heading(2), heading(3, { text: '' })] } });

    expect(validatePageTreeV2(tree as unknown as PageDocumentV2)).toEqual([
      { path: 'content[0].props.items[1].props.text', segments: ['content', 0, 'props', 'items', 1, 'props', 'text'], elementId: U(3), message: 'Obrigatório.' },
    ]);
  });

  it('reports nesting violations on the child type', () => {
    const tree = doc({ ...el(1, 'section'), props: { id: U(1), items: [{ ...el(2, 'columns'), props: { id: U(2), items: [heading(3)] } }] } });

    const [issue] = validatePageTreeV2(tree as unknown as PageDocumentV2);

    expect(issue).toMatchObject({ path: 'content[0].props.items[0].props.items[0].type', elementId: U(3) });
  });

  it('reports the second h1 and duplicate anchors on their elements', () => {
    const tree = doc(
      { ...el(1, 'section'), props: { id: U(1), items: [heading(2, { tag: 'h1', anchor: 'a' }), heading(3, { tag: 'h1', anchor: 'a' })] } },
    );

    const issues = validatePageTreeV2(tree as unknown as PageDocumentV2);

    expect(issues.map((i) => [i.elementId, i.path.split('.').pop()])).toEqual([
      [U(3), 'anchor'],
      [U(3), 'tag'],
    ]);
  });

  it('rejects a document over 512 KiB', () => {
    const big = doc(...Array.from({ length: 40 }, (_, s) => ({
      ...el(s * 10 + 1, 'section'),
      props: { id: U(s * 10 + 1), items: Array.from({ length: 8 }, (_, i) => el(s * 10 + 2 + i, 'text', { text: 'x'.repeat(2000) })) },
    })));

    expect(validatePageTreeV2(big as unknown as PageDocumentV2).map((i) => i.message)).toContain('Página grande demais.');
  });

  it('accepts a document just under 512 KiB', () => {
    const ok = doc(...Array.from({ length: 40 }, (_, s) => ({
      ...el(s * 10 + 1, 'section'),
      props: { id: U(s * 10 + 1), items: Array.from({ length: 5 }, (_, i) => el(s * 10 + 2 + i, 'text', { text: 'x'.repeat(2000) })) },
    })));

    expect(validatePageTreeV2(ok as unknown as PageDocumentV2)).toEqual([]);
  });
});

describe('draft vs complete', () => {
  const incomplete = doc({ ...el(1, 'section'), props: { id: U(1), items: [el(2, 'heading', { text: '', tag: 'h2' }), el(3, 'button', { label: '', href: '' })] } });

  it('draft accepts empty content props, complete does not', () => {
    expect(pageDraftV2Schema.safeParse(incomplete).success).toBe(true);
    expect(pageDocumentV2Schema.safeParse(incomplete).success).toBe(false);
  });

  it('draft still enforces structure, styles and reserved braces', () => {
    const nested = doc({ ...el(1, 'section'), props: { id: U(1), items: [{ ...el(2, 'section'), props: { id: U(2), items: [] } }] } });
    const px = doc({ ...el(1, 'section'), props: { id: U(1), style: { desktop: { pt: '40px' } } } });
    const braces = doc({ ...el(1, 'section'), props: { id: U(1), items: [el(2, 'text', { text: '{{x}}' })] } });

    for (const bad of [nested, px, braces]) expect(pageDraftV2Schema.safeParse(bad).success).toBe(false);
  });
});

describe('request vs response schemas', () => {
  it('PUT /draft (saveDraftSchema) accepts v1 and v2, validating each by its schemaVersion', () => {
    expect(saveDraftSchema.safeParse({ document: doc(), baseRevision: 0 }).success).toBe(true);
    expect(saveDraftSchema.safeParse({ document: doc(), baseRevision: -1 }).success).toBe(false);
    expect(saveDraftSchema.safeParse({ document: doc(el(1, 'nope')), baseRevision: 0 }).success).toBe(false);
    expect(saveDraftSchema.safeParse({ document: createEmptyDocument(), baseRevision: 0 }).success).toBe(true);
    expect(saveDraftSchema.safeParse({ document: { schemaVersion: 3, content: [] }, baseRevision: 0 }).success).toBe(false);
  });

  it('read schemas accept v1 or v2', () => {
    expect(pageDraftReadSchema.safeParse(doc()).success).toBe(true);
    expect(pageDraftReadSchema.safeParse(createEmptyDocument()).success).toBe(true);
    expect(pageDocumentReadSchema.safeParse(doc()).success).toBe(true);
    expect(pageDocumentReadSchema.safeParse(createEmptyDocument()).success).toBe(true);
    expect(pageDocumentReadSchema.safeParse({ schemaVersion: 3 }).success).toBe(false);
  });
});

describe('isPageVideoUrl', () => {
  it('accepts only https on the closed host list', () => {
    expect(isPageVideoUrl('https://youtu.be/abc')).toBe(true);
    expect(isPageVideoUrl('https://player.vimeo.com/video/1')).toBe(true);
    for (const v of ['http://youtu.be/abc', 'https://evil.io/x', 'https://youtu.be.evil.io/x', 'https://user@youtu.be/x', 'javascript:alert(1)', '']) {
      expect(isPageVideoUrl(v)).toBe(false);
    }
  });
});

describe('draft safety (draft reaches the editor canvas with the public renderers)', () => {
  const one = (type: string, props: Record<string, unknown>) =>
    doc({ ...el(1, 'section'), props: { id: U(1), items: [el(2, type, props)] } });
  const draftOk = (d: unknown) => pageDraftV2Schema.safeParse(d).success;

  it('validates every non-empty href/url exactly like the complete mode', () => {
    expect(draftOk(one('button', { label: '', href: 'javascript:alert(1)' }))).toBe(false);
    expect(draftOk(one('button', { label: '', href: '/ok' }))).toBe(true);
    expect(draftOk(one('image', { url: 'http://x.io/a.png', alt: '' }))).toBe(false);
    expect(draftOk(one('video', { url: 'https://evil.io/x' }))).toBe(false);
    expect(draftOk(one('video', { url: '' }))).toBe(true);
    expect(draftOk(one('text', { text: 'ver [aqui](javascript:alert(1))' }))).toBe(false);
    expect(draftOk(one('plan', { name: '', price: '', cta: { label: '', href: 'data:x' } }))).toBe(false);
  });

  it('refuses keys outside the type shape, including locked', () => {
    expect(draftOk(one('heading', { text: 'a', tag: 'h2', onclick: 'x' }))).toBe(false);
    expect(draftOk(one('heading', { text: 'a', tag: 'h2', locked: true }))).toBe(false);
    expect(draftOk(doc({ ...el(1, 'section'), props: { id: U(1), locked: true } }))).toBe(false);
  });

  it('accepts the fresh defaults the editor inserts', () => {
    expect(draftOk(one('featuredEvent', { eventId: '' }))).toBe(true);
    expect(draftOk(one('eventRail', { title: '', source: { kind: 'live' }, limit: 8 }))).toBe(true);
    expect(draftOk(one('faq', { items: [{ question: '', answer: '' }] }))).toBe(true);
    expect(draftOk(one('iconList', { items: [''] }))).toBe(true);
  });
});

describe('parsePageInlineText', () => {
  it('parses bold, italic, bold+italic and links', () => {
    expect(parsePageInlineText('a **b** *c* ***d*** [e](/x)')).toEqual([
      { text: 'a ' }, { text: 'b', bold: true }, { text: ' ' }, { text: 'c', italic: true }, { text: ' ' },
      { text: 'd', bold: true, italic: true }, { text: ' ' }, { text: 'e', href: '/x' },
    ]);
  });

  it('allows emphasis inside a link label', () => {
    expect(parsePageInlineText('[**oi**](https://x.io)')).toEqual([{ text: 'oi', bold: true, href: 'https://x.io' }]);
  });

  it('keeps references, titles, html and unclosed marks as literal text', () => {
    for (const t of ['[a][r]', '<b>x</b>', '**aberto', 'a * b', '[a](/x "t")']) {
      expect(parsePageInlineText(t)).toEqual([{ text: t }]);
    }
  });

  it('validates the link rule on every parsed href', () => {
    expect(isPageInlineTextValid('[a](/x) e [b](https://x.io)')).toBe(true);
    expect(isPageInlineTextValid('[a](javascript:alert(1))')).toBe(false);
    expect(isPageInlineTextValid('[a]()')).toBe(false);
    expect(isPageInlineTextValid('[a](http://x.io)')).toBe(false);
  });
});

describe('pageVideoEmbed', () => {
  it('extracts provider and id', () => {
    expect(pageVideoEmbed('https://www.youtube.com/watch?v=abcDEF12345')).toEqual({ provider: 'youtube', id: 'abcDEF12345' });
    expect(pageVideoEmbed('https://youtu.be/abcDEF12345')).toEqual({ provider: 'youtube', id: 'abcDEF12345' });
    expect(pageVideoEmbed('https://www.youtube-nocookie.com/embed/abc_-1')).toEqual({ provider: 'youtube', id: 'abc_-1' });
    expect(pageVideoEmbed('https://vimeo.com/123')).toEqual({ provider: 'vimeo', id: '123' });
    expect(pageVideoEmbed('https://player.vimeo.com/video/123')).toEqual({ provider: 'vimeo', id: '123' });
    expect(pageVideoEmbed('https://cdn.showon.io/v/a.mp4')).toEqual({ provider: 'platform', id: 'v/a.mp4' });
  });

  it('returns null for anything else', () => {
    for (const v of ['https://evil.io/x', 'https://www.youtube.com/', 'https://youtu.be/a b', 'https://vimeo.com/abc', 'x']) {
      expect(pageVideoEmbed(v)).toBeNull();
    }
  });

  it('isPageVideoUrl refuses explicit ports', () => {
    expect(isPageVideoUrl('https://youtu.be:8443/abc')).toBe(false);
    expect(isPageVideoUrl('https://youtu.be:443/abc')).toBe(true); // default port is normalised away by URL
  });
});
