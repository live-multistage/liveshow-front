import type { Breakpoint, ElementType, PageDocumentV2, PageElement } from './document-v2';
import { isPageHref } from './schemas';
import { isPageVideoUrl } from './schemas-v2';
import type { PageDocument, PageSection, PageTextRun } from './types';

/*
 * v1 section -> v2 element tree (SDD §3). Visual guide: live-show-react features/pages-public/sections/*.scss.
 *
 * | v1        | v2 (inside `section`, gap md)                                                              |
 * |-----------|--------------------------------------------------------------------------------------------|
 * | hero      | columns 3-2 (mobile: 1) [column: label, heading h1, text, group(buttons)] [column: image]   |
 * | audience  | columns 1-1 [column: text] [column: group(counter...)]                                     |
 * | text      | heading + one `text` per paragraph (runs -> **bold** *italic* [label](href))                |
 * | features  | heading + 3-col grid of card columns [label(icon), heading h3, text]                        |
 * | how       | label(eyebrow) + heading + 3-col grid of cards [label(01), heading h3, text]                |
 * | media     | image | video (+ text caption); video outside VIDEO_ALLOWED_HOSTS becomes a text link       |
 * | stats     | heading? + 3-col grid of cards [counter]                                                    |
 * | rail      | heading + eventRail (same props)                                                            |
 * | featured  | featuredEvent (v1 renders no heading)                                                       |
 * | pricing   | heading + 3-col grid of columns [plan]                                                      |
 * | faq       | heading + faq                                                                               |
 * | final     | heading + text + group(button), all centered                                                |
 *
 * Grids fill the last row with empty columns so card widths match v1's 3-column grid.
 * Section: hidden/showOn -> `hidden`; spacing compact/normal/wide -> pt/pb xxxl/l1/l2;
 * background default/accent -> color bg/accent; image -> gradient glow (v1 "image" never had a URL, only a glow).
 * Child ids are derived from the section id, so converting twice yields the same document.
 */

type Style = Record<string, unknown>;
const ALL_BREAKPOINTS: Breakpoint[] = ['desktop', 'tablet', 'mobile'];
const GRID_COLS = 3;

/** Deterministic uuid-shaped id (128-bit FNV-1a over `parent:key`); the schema only checks the uuid shape. */
function childId(parent: string, key: string): string {
  const input = `${parent}:${key}`;
  let hex = '';
  for (const seed of [0x811c9dc5, 0x01000193, 0xcbf29ce4, 0x84222325]) {
    let h = seed >>> 0;
    for (let i = 0; i < input.length; i++) h = Math.imul(h ^ input.charCodeAt(i), 0x01000193) >>> 0;
    hex += h.toString(16).padStart(8, '0');
  }
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

const el = (type: ElementType, id: string, props: Record<string, unknown> = {}): PageElement =>
  ({ type, props: { id, ...props } }) as PageElement;
const style = (desktop: Style, mobile?: Style) => ({ style: { desktop, ...(mobile ? { mobile } : {}) } });
const color = (token: string) => ({ kind: 'color', token });

function inlineMarkup(runs: PageTextRun[]): string {
  return runs
    .map((r) => {
      const mark = r.bold && r.italic ? '***' : r.bold ? '**' : r.italic ? '*' : '';
      const text = `${mark}${r.text}${mark}`;
      return r.href && isPageHref(r.href) ? `[${text}](${r.href})` : text;
    })
    .join('');
}

function sectionBody(section: PageSection, isFirstHero: boolean): PageElement[] {
  const sid = section.id;
  const id = (key: string) => childId(sid, key);
  const heading = (key: string, text: string, extra: Style = {}, tag: 'h1' | 'h2' | 'h3' = 'h2', typo = 'display') =>
    el('heading', id(key), { text, tag, ...style({ typo, ...extra }) });
  const lead = (key: string, text: string, extra: Style = {}) =>
    el('text', id(key), { text, ...style({ typo: 'md', color: 'textSecondary', maxw: 'prose', ...extra }) });
  const eyebrow = (key: string, text: string) => el('label', id(key), { text, ...style({ typo: 'label', color: 'price' }) });
  const button = (key: string, cta: { label: string; href: string }, variant: 'primary' | 'secondary') =>
    el('button', id(key), { label: cta.label, href: cta.href, ...style({ variant, size: 'md' }) });
  const card = (key: string, items: PageElement[]) =>
    el('column', id(key), {
      items,
      ...style({ bg: color('surface'), p: 'xl', gap: 'sm', radius: 'lg', border: 'faint' }),
    });
  const grid = (key: string, columns: PageElement[]): PageElement[] => {
    const rows: PageElement[] = [];
    for (let r = 0; r * GRID_COLS < columns.length; r++) {
      const cells = columns.slice(r * GRID_COLS, (r + 1) * GRID_COLS);
      while (cells.length < GRID_COLS) cells.push(el('column', id(`${key}${r}:pad${cells.length}`)));
      rows.push(el('columns', id(`${key}${r}`), { items: cells, ...style({ cols: GRID_COLS, ratio: '1-1-1', gap: 'lg' }, { cols: 1 }) }));
    }
    return rows;
  };
  const cardBody = (key: string, i: number, title: string, text: string, tag: PageElement | null) =>
    card(`${key}${i}`, [
      ...(tag ? [tag] : []),
      heading(`${key}${i}:t`, title, {}, 'h3', 'xl'),
      el('text', id(`${key}${i}:x`), { text, ...style({ typo: 'sm', color: 'textMuted' }) }),
    ]);

  switch (section.type) {
    case 'hero': {
      const p = section.props;
      const buttons = [
        ...(p.primaryCta ? [button('b0', p.primaryCta, 'primary')] : []),
        ...(p.secondaryCta ? [button('b1', p.secondaryCta, 'secondary')] : []),
      ];
      const copy = el('column', id('c0'), {
        ...style({ gap: 'md' }),
        items: [
          ...(p.eyebrow ? [eyebrow('e', p.eyebrow)] : []),
          heading('h', p.title, {}, isFirstHero ? 'h1' : 'h2', 'hero'),
          ...(p.subtitle ? [lead('s', p.subtitle)] : []),
          ...(buttons.length ? [el('group', id('g'), { items: buttons, ...style({ gap: 'md', my: 'md' }) })] : []),
        ],
      });
      const media = p.image && el('column', id('c1'), { items: [el('image', id('i'), { url: p.image.url, alt: p.image.alt, ...style({ radius: 'lg' }) })] });
      return [
        el('columns', id('cols'), {
          items: media ? [copy, media] : [copy],
          ...style(media ? { cols: 2, ratio: '3-2', gap: 'xxl', valign: 'center' } : { cols: 1 }, { cols: 1 }),
        }),
      ];
    }
    case 'audience': {
      const p = section.props;
      const text = el('column', id('c0'), { items: [lead('t', p.text, { typo: 'md' })] });
      const counters = p.counters.length
        ? el('column', id('c1'), {
            items: [
              el('group', id('g'), {
                ...style({ gap: 'xxl' }),
                items: p.counters.map((c, i) => el('counter', id(`n${i}`), { value: c.value, label: c.label, ...style({ typo: 'xxl' }) })),
              }),
            ],
          })
        : null;
      return [
        el('columns', id('cols'), {
          items: counters ? [text, counters] : [text],
          ...style(counters ? { cols: 2, ratio: '1-1', gap: 'xl', valign: 'center' } : { cols: 1 }, { cols: 1 }),
        }),
      ];
    }
    case 'text': {
      const p = section.props;
      return [
        ...(p.title ? [heading('h', p.title)] : []),
        ...p.paragraphs.map((runs, i) => lead(`p${i}`, inlineMarkup(runs))),
      ];
    }
    case 'features': {
      const p = section.props;
      return [
        heading('h', p.title),
        ...grid('g', p.items.map((it, i) => cardBody('f', i, it.title, it.text, it.icon ? el('label', id(`f${i}:i`), { text: it.icon, ...style({ typo: 'label', color: 'action' }) }) : null))),
      ];
    }
    case 'how': {
      const p = section.props;
      return [
        ...(p.eyebrow ? [eyebrow('e', p.eyebrow)] : []),
        heading('h', p.title),
        ...grid('g', p.steps.map((s, i) => cardBody('s', i, s.title, s.text, el('label', id(`s${i}:n`), { text: String(i + 1).padStart(2, '0'), ...style({ typo: 'label', color: 'action' }) })))),
      ];
    }
    case 'media': {
      const p = section.props;
      const caption = p.caption && el('text', id('cap'), { text: p.caption, ...style({ typo: 'sm', color: 'textMuted' }) });
      const embed =
        p.kind === 'image'
          ? el('image', id('m'), { url: p.url, alt: p.alt, ...style({ radius: 'lg' }) })
          : isPageVideoUrl(p.url)
            ? el('video', id('m'), { url: p.url, ...style({ radius: 'lg' }) })
            : // v2 only embeds allow-listed video hosts; keep the content reachable as a link.
              lead('m', `[${p.alt}](${p.url})`);
      return caption ? [embed, caption] : [embed];
    }
    case 'stats': {
      const p = section.props;
      return [
        ...(p.title ? [heading('h', p.title)] : []),
        ...grid('g', p.items.map((s, i) => card(`k${i}`, [el('counter', id(`k${i}:n`), { value: s.value, label: s.label, ...style({ typo: 'display' }) })]))),
      ];
    }
    case 'rail':
      return [heading('h', section.props.title), el('eventRail', id('r'), { ...section.props })];
    case 'featured':
      return [el('featuredEvent', id('f'), { ...section.props })];
    case 'pricing': {
      const p = section.props;
      return [
        heading('h', p.title),
        ...grid('g', p.plans.map((plan, i) =>
          el('column', id(`k${i}`), {
            items: [el('plan', id(`k${i}:p`), { ...plan, ...style({ bg: color('surface'), p: 'xl', radius: 'lg', border: 'faint' }) })],
          }),
        )),
      ];
    }
    case 'faq':
      return [heading('h', section.props.title), el('faq', id('q'), { items: section.props.items })];
    case 'final': {
      const p = section.props;
      return [
        heading('h', p.title, { align: 'center' }),
        ...(p.subtitle ? [lead('s', p.subtitle, { align: 'center' })] : []),
        el('group', id('g'), { items: [button('b', p.cta, 'primary')], ...style({ halign: 'center', my: 'md' }) }),
      ];
    }
  }
}

const SPACING_PAD = { compact: 'xxxl', normal: 'l1', wide: 'l2' } as const;

function upgradeSection(section: PageSection, isFirstHero: boolean): PageElement<'section'> {
  const { background, spacing, showOn } = section.appearance;
  const hiddenOn: Breakpoint[] = section.hidden
    ? ALL_BREAKPOINTS
    : showOn === 'desktop' ? ['tablet', 'mobile'] : showOn === 'mobile' ? ['desktop', 'tablet'] : [];
  const bg = background === 'image' ? { kind: 'gradient', token: 'glow' } : color(background === 'accent' ? 'accent' : 'bg');
  return el('section', section.id, {
    items: sectionBody(section, isFirstHero),
    ...style({ bg, pt: SPACING_PAD[spacing], pb: SPACING_PAD[spacing], gap: 'md' }),
    ...(hiddenOn.length ? { hidden: Object.fromEntries(hiddenOn.map((b) => [b, true])) } : {}),
  }) as PageElement<'section'>;
}

/** v1 -> v2 (pure, deterministic); a v2 document is returned as is. Other shapes throw. */
export function upgradePageDocument(doc: PageDocument | PageDocumentV2): PageDocumentV2 {
  const raw = doc as { schemaVersion?: unknown; context?: PageDocument['context']; sections?: PageSection[] } | null;
  if (raw?.schemaVersion === 2) return doc as PageDocumentV2;
  if (raw?.schemaVersion !== 1) throw new Error('Unsupported page schemaVersion');
  const firstHero = raw.sections?.findIndex((s) => s.type === 'hero') ?? -1;
  return {
    schemaVersion: 2,
    context: raw.context ?? { type: 'none' },
    root: { props: {} },
    content: (raw.sections ?? []).map((s, i) => upgradeSection(s, i === firstHero)),
  };
}
