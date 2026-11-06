import { describe, expect, it } from 'vitest';
import parityCases from './page-parity-cases.json';
import { pageDocumentV2Schema, parsePageInlineText, validatePageTreeV2 } from './schemas-v2';
import { PAGE_EDITOR_PROFILES, validatePageAgainstProfile } from './profiles';
import goldenCases from './page-upgrade-cases.json';
import { writeFileSync } from 'node:fs';
import { upgradePageDocument } from './upgrade-v2';
import { PAGE_V2_LIMITS, type PageElement, type PageDocumentV2 } from './document-v2';
import type { PageDocument, PageSection, PageSectionType, PageTextRun } from './types';

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
    expect(withAppearance(false, { showOn: 'desktop' }).hidden).toEqual({ mobile: true });
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
    features: ['section', 'heading', 'columns', 'column', 'label', 'heading', 'text', 'column', 'heading', 'text'],
    how: ['section', 'heading', 'columns', 'column', 'label', 'heading', 'text', 'column', 'label', 'heading', 'text', 'column', 'label', 'heading', 'text'],
    media: ['section', 'text', 'text'], // sample is a non-allowlisted video (link) + caption
    stats: ['section', 'columns', 'column', 'counter', 'column', 'counter'],
    rail: ['section', 'heading', 'eventRail'],
    featured: ['section', 'featuredEvent'],
    pricing: ['section', 'heading', 'columns', 'column', 'plan', 'column', 'plan'],
    faq: ['section', 'heading', 'faq'],
    final: ['section', 'heading', 'group', 'button'],
  };
  it.each(ALL_TYPES)('%s keeps the expected shape', (type) => {
    const v2 = upgrade(sampleSection(type));
    expect(typesOf(v2.content[0]!)).toEqual(SHAPES[type]);
    expect(pageDocumentV2Schema.safeParse(v2).success).toBe(true);
  });
});

const countElements = (el: PageElement): number => 1 + kids(el).reduce((n, k) => n + countElements(k), 0);
const uuid = (n: number) => `${String(n).padStart(8, '0')}-0000-4000-8000-000000000000`;

// Worst case allowed by v1: 30 sections (max) of the type with most elements: features, 6 items, all with an icon
// (section + heading + 2 rows + 6 x [column, label, heading, text] = 28 elements per section, 840 in total).
// Other types are smaller (how 25, audience 10, hero 11 ...). `text` is bounded too: all paragraphs merge into ONE element,
// so v1's 2000-char cap can no longer fan out into one element per paragraph (it used to reach 1000+ in a single section).
const longText = (n: number) => 'x'.repeat(n);
const WORST_CASE: PageDocument = {
  schemaVersion: 1,
  context: { type: 'none' },
  sections: Array.from({ length: 30 }, (_, i) => ({
    id: uuid(i + 1), type: 'features', hidden: false,
    appearance: { background: 'accent', spacing: 'wide', showOn: 'desktop' },
    props: { title: longText(90), items: Array.from({ length: 6 }, () => ({ icon: 'sparkles', title: longText(60), text: longText(200) })) },
  })) as PageSection[],
};

// 2000 one-char paragraphs (an escaped backslash) is the most v1 allows (2000 chars in total); each used to become a text element.
const MANY_PARAGRAPHS: PageDocument = {
  schemaVersion: 1,
  context: { type: 'none' },
  sections: [{
    id: uuid(1), type: 'text', hidden: false,
    appearance: { background: 'default', spacing: 'normal', showOn: 'all' },
    props: { title: 'T', paragraphs: Array.from({ length: 2000 }, () => [{ text: '\\' }]) },
  }] as PageSection[],
};

describe('worst case of v1', () => {
  it('converts to a valid v2 document inside the platform profile', () => {
    const v2 = upgradePageDocument(WORST_CASE);
    expect(v2.content.reduce((n, s) => n + countElements(s), 0)).toBe(840);
    expect(JSON.stringify(v2).length).toBeLessThan(PAGE_V2_LIMITS.maxBytes);
    expect(validatePageTreeV2(v2)).toEqual([]);
    expect(pageDocumentV2Schema.safeParse(v2).success).toBe(true);
    expect(validatePageAgainstProfile(v2, 'platform')).toEqual([]);
  });
});

describe('worst case of v1: many paragraphs', () => {
  it('merges all paragraphs into one text element and stays valid, 30 sections', () => {
    const doc30: PageDocument = { ...MANY_PARAGRAPHS, sections: Array.from({ length: 30 }, (_, i) => ({ ...MANY_PARAGRAPHS.sections[0]!, id: uuid(i + 1) })) };
    const v2 = upgradePageDocument(doc30);
    expect(v2.content.reduce((n, s) => n + countElements(s), 0)).toBe(30 * 3);
    expect(pageDocumentV2Schema.safeParse(v2).success).toBe(true);
    expect(validatePageAgainstProfile(v2, 'platform')).toEqual([]);
    const text = (v2.content[0]!.props as { items: PageElement[] }).items[1]!.props as { text: string };
    expect(text.text.split('\n\n')).toHaveLength(2000);
  });
});

describe('grid last row', () => {
  it('has no padding columns: cols and ratio follow the number of cards', () => {
    const feat = (n: number) => ({ ...sampleSection('features'), props: { title: 'T', items: Array.from({ length: n }, () => ({ title: 'a', text: 'b' })) } }) as PageSection;
    const rows = (n: number) => kids(upgrade(feat(n)).content[0]!).filter((e) => e.type === 'columns').map((r) => ({ n: kids(r).length, d: (r.props as { style: { desktop: object } }).style.desktop }));
    expect(rows(4)).toEqual([{ n: 3, d: { cols: 3, ratio: '1-1-1', gap: 'lg' } }, { n: 1, d: { cols: 1, gap: 'lg' } }]);
    expect(rows(5)[1]).toEqual({ n: 2, d: { cols: 2, ratio: '1-1', gap: 'lg' } });
  });
});

describe('inline markup round trip', () => {
  const roundTrip = (runs: PageTextRun[]) => {
    const t = upgrade({ ...sampleSection('text'), props: { paragraphs: [runs] } } as PageSection);
    const text = (t.content[0]!.props as { items: PageElement[] }).items[0]!.props as { text: string };
    return parsePageInlineText(text.text);
  };
  it.each([
    [[{ text: '2*3*4 [x](javascript:1)' }]],
    [[{ text: 'a\\b *c* **d** (e)' }, { text: 'f]g[', bold: true }, { text: 'h*i', italic: true, bold: true, href: 'https://x.io/a_(b)*c' }]],
    [[{ text: 'ok ' }, { text: 'link', href: '/x' }, { text: ' fim' }]],
  ] as PageTextRun[][][])('runs %#', (runs) => expect(roundTrip(runs)).toEqual(runs));

  it('escapes alt and url of the video fallback link', () => {
    const media = { ...sampleSection('media'), props: { kind: 'video', url: 'https://x.io/v(1).mp4', alt: 'a [b] *c*' } } as PageSection;
    const t = (upgrade(media).content[0]!.props as { items: PageElement[] }).items[0]!.props as { text: string };
    expect(parsePageInlineText(t.text)).toEqual([{ text: 'a [b] *c*', href: 'https://x.io/v(1).mp4' }]);
  });
});

// Golden: the back proves the same ids and shape. Regenerate with UPDATE_GOLDEN=1.
const GOLDEN_INPUTS = [
  ...VALID.map((c) => ({ name: c.name, input: c.input as PageDocument })),
  { name: 'worst case: 30 features sections', input: WORST_CASE },
  { name: 'many paragraphs: text section with 2000 paragraphs', input: MANY_PARAGRAPHS },
];
if (process.env.UPDATE_GOLDEN) {
  writeFileSync(new URL('./page-upgrade-cases.json', import.meta.url), JSON.stringify(GOLDEN_INPUTS.map((c) => ({ ...c, output: upgradePageDocument(c.input) }))));
}
describe('page-upgrade-cases (golden)', () => {
  const GOLDEN = goldenCases as Array<{ name: string; input: PageDocument; output: PageDocumentV2 }>;
  it('has the same inputs as page-parity-cases.json, so it cannot go stale silently', () =>
    expect(GOLDEN.slice(0, VALID.length).map((c) => c.input)).toEqual(VALID.map((c) => c.input)));
  it('covers every valid v1 parity case and the worst cases', () => expect(GOLDEN.map((c) => c.name)).toEqual(GOLDEN_INPUTS.map((c) => c.name)));
  it.each(GOLDEN)('$name', ({ input, output }) => expect(upgradePageDocument(input)).toEqual(output));
});
