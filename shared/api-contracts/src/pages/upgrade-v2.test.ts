import { describe, expect, it } from 'vitest';
import parityCases from './page-parity-cases.json';
import { pageDocumentV2Schema, validatePageTreeV2 } from './schemas-v2';
import { upgradePageDocument } from './upgrade-v2';
import type { PageElement, PageDocumentV2 } from './document-v2';
import type { PageDocument, PageSection, PageSectionType } from './types';

const CASES = parityCases as Array<{ name: string; input: PageDocument; valid: boolean }>;
const VALID = CASES.filter((c) => c.valid && (c.input as { schemaVersion?: number }).schemaVersion === 1);
const ALL_TYPES: PageSectionType[] = ['hero', 'audience', 'text', 'features', 'how', 'media', 'stats', 'rail', 'featured', 'pricing', 'faq', 'final'];
// The first valid case ("all 12 section types") holds one section of each type.
const sampleSection = (type: PageSectionType): PageSection =>
  VALID.flatMap((c) => c.input.sections).find((s) => s.type === type)!;

const SLOTS = ['section', 'columns', 'column', 'group'];
const kids = (el: PageElement) => (SLOTS.includes(el.type) ? ((el.props as { items?: PageElement[] }).items ?? []) : []);
const typesOf = (el: PageElement): string[] => [el.type, ...kids(el).flatMap(typesOf)];
const upgrade = (...sections: PageSection[]) => upgradePageDocument({ schemaVersion: 1, context: { type: 'none' }, sections });
const ids = (el: PageElement): string[] => [(el.props as { id: string }).id, ...kids(el).flatMap(ids)];

describe('upgradePageDocument', () => {
  it('has valid v1 parity cases', () => expect(VALID.length).toBeGreaterThan(0));

  it.each(VALID)('$name converts to a valid v2 document', ({ input }) => {
    const v2 = upgradePageDocument(input);
    expect(pageDocumentV2Schema.safeParse(v2).success).toBe(true);
    expect(validatePageTreeV2(v2)).toEqual([]);
    expect(v2.content.map((s) => s.props.id)).toEqual(input.sections.map((s) => s.id));
  });

  it('is idempotent and deterministic', () => {
    for (const { input } of VALID) {
      const once = upgradePageDocument(input);
      expect(upgradePageDocument(input)).toEqual(once);
      expect(upgradePageDocument(once)).toBe(once);
    }
  });

  it('returns v2 untouched and rejects other shapes', () => {
    const v2 = upgrade();
    expect(upgradePageDocument(v2)).toBe(v2);
    expect(() => upgradePageDocument(null as never)).toThrow('Unsupported page schemaVersion');
  });

  it('maps hidden, showOn, spacing and background', () => {
    const base = sampleSection('final');
    const withAppearance = (hidden: boolean, appearance: Partial<PageSection['appearance']>) =>
      upgrade({ ...base, hidden, appearance: { background: 'default', spacing: 'normal', showOn: 'all', ...appearance } }).content[0]!.props;
    expect(withAppearance(false, {}).hidden).toBeUndefined();
    expect(withAppearance(true, {}).hidden).toEqual({ desktop: true, tablet: true, mobile: true });
    expect(withAppearance(false, { showOn: 'desktop' }).hidden).toEqual({ tablet: true, mobile: true });
    expect(withAppearance(false, { showOn: 'mobile' }).hidden).toEqual({ desktop: true, tablet: true });
    expect(withAppearance(false, { spacing: 'compact' }).style?.desktop).toMatchObject({ pt: 'xxxl', pb: 'xxxl', bg: { kind: 'color', token: 'bg' } });
    expect(withAppearance(false, { spacing: 'wide', background: 'accent' }).style?.desktop).toMatchObject({ pt: 'l2', bg: { kind: 'color', token: 'accent' } });
    expect(withAppearance(false, { spacing: 'normal', background: 'image' }).style?.desktop).toMatchObject({ pt: 'l1', bg: { kind: 'gradient', token: 'glow' } });
  });

  it('only the first hero gets the h1', () => {
    const hero = sampleSection('hero');
    const [a, b] = upgrade(hero, { ...hero, id: '00000099-1111-4111-8111-111111111111' }).content;
    const tag = (s: PageElement<'section'>) => JSON.stringify(s).match(/"tag":"(h\d)","[^]*?"typo":"hero"|"typo":"hero"/);
    expect(JSON.stringify(a)).toContain('"tag":"h1"');
    expect(JSON.stringify(b)).not.toContain('"tag":"h1"');
    expect(tag(b)).toBeTruthy();
  });

  it('keeps child ids unique across sections', () => {
    const v2 = upgradePageDocument(VALID[0]!.input);
    const all = v2.content.flatMap(ids);
    expect(new Set(all).size).toBe(all.length);
  });

  it('turns text runs into inline markup', () => {
    const text = upgrade({ ...sampleSection('text'), props: { paragraphs: [[{ text: 'a ' }, { text: 'b', bold: true, italic: true, href: 'https://x.io' }, { text: ' c', italic: true }]] } } as PageSection);
    expect(JSON.stringify(text)).toContain('a [***b***](https://x.io)* c*');
  });

  it('keeps non-allowlisted video reachable as a link', () => {
    const media = { ...sampleSection('media'), props: { kind: 'video', url: 'https://x.io/v.mp4', alt: 'Vídeo' } } as PageSection;
    expect(typesOf(upgrade(media).content[0]!)).toEqual(['section', 'text']);
    const yt = { ...media, props: { ...media.props, url: 'https://youtu.be/abc' } } as PageSection;
    expect(typesOf(upgrade(yt).content[0]!)).toEqual(['section', 'video']);
  });

  // Shape per v1 section type (12). Exact tree, so a mapping change is a conscious edit.
  const SHAPES: Record<PageSectionType, string[]> = {
    hero: ['section', 'columns', 'column', 'label', 'heading', 'text', 'group', 'button', 'button', 'column', 'image'],
    audience: ['section', 'columns', 'column', 'text', 'column', 'group', 'counter'],
    text: ['section', 'heading', 'text'],
    features: ['section', 'heading', 'columns', 'column', 'label', 'heading', 'text', 'column', 'heading', 'text', 'column'],
    how: ['section', 'heading', 'columns', 'column', 'label', 'heading', 'text', 'column', 'label', 'heading', 'text', 'column', 'label', 'heading', 'text'],
    media: ['section', 'text', 'text'], // sample is a non-allowlisted video (link) + caption
    stats: ['section', 'columns', 'column', 'counter', 'column', 'counter', 'column'],
    rail: ['section', 'heading', 'eventRail'],
    featured: ['section', 'featuredEvent'],
    pricing: ['section', 'heading', 'columns', 'column', 'plan', 'column', 'plan', 'column'],
    faq: ['section', 'heading', 'faq'],
    final: ['section', 'heading', 'group', 'button'],
  };
  it.each(ALL_TYPES)('%s keeps the expected shape', (type) => {
    const v2 = upgrade(sampleSection(type));
    expect(typesOf(v2.content[0]!)).toEqual(SHAPES[type]);
    expect(pageDocumentV2Schema.safeParse(v2).success).toBe(true);
  });
});
