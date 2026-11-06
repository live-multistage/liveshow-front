import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { upgradePageDocument, type PageDocument, type PageElement, type PageDocumentV2, type PublicPage, type ResolvedRailEvent } from '@live-show/api-contracts';
import parityCases from '../../../../shared/api-contracts/src/pages/page-parity-cases.json';
import { ElementRenderer, PageRoot, type RenderContext } from './index';
import { DEFAULT_EDITOR_LABELS } from './types';

const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const empty: PublicPage['resolved'] = { rails: {}, featured: {}, live: {} };
const ctx = (over: Partial<RenderContext> = {}): RenderContext => ({ resolved: empty, mode: 'public', ...over });
const el = (type: string, props: Record<string, unknown>) => ({ type, props: { id: ID(1), ...props } }) as unknown as PageElement;
const event = (over: Partial<ResolvedRailEvent> = {}): ResolvedRailEvent => ({ id: 'e1', title: 'Show A', posterUrl: null, startsAt: null, isLive: false, ...over });

describe('text', () => {
  it('renders one paragraph per blank line, with bold, italic and safe links', () => {
    const { container } = render(
      <ElementRenderer ctx={ctx()} element={el('text', { text: 'Olá **mundo** e *você*\n\nVeja [site](https://x.io) e [mau](javascript:alert(1))' })} />,
    );
    expect(container.querySelectorAll('p')).toHaveLength(2);
    expect(container.querySelector('strong')?.textContent).toBe('mundo');
    expect(container.querySelector('em')?.textContent).toBe('você');
    const link = screen.getByRole('link', { name: 'site' });
    expect(link.getAttribute('target')).toBe('_blank');
    expect(screen.queryByRole('link', { name: 'mau' })).toBeNull();
    expect(container.textContent).toContain('mau');
  });
  it('never emits inline style or raw html', () => {
    const { container } = render(<ElementRenderer ctx={ctx()} element={el('text', { text: '<img src=x onerror=alert(1)>' })} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('[style]')).toBeNull();
  });
});

describe('video', () => {
  it('builds the embed url from the id, never from the typed url', () => {
    const { container } = render(<ElementRenderer ctx={ctx()} element={el('video', { url: 'https://www.youtube.com/watch?v=abc123&list=evil' })} />);
    expect(container.querySelector('iframe')?.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/abc123');
  });
  it('vimeo and unknown hosts', () => {
    const { container, rerender } = render(<ElementRenderer ctx={ctx()} element={el('video', { url: 'https://vimeo.com/12345?x=1' })} />);
    expect(container.querySelector('iframe')?.getAttribute('src')).toBe('https://player.vimeo.com/video/12345');
    rerender(<ElementRenderer ctx={ctx()} element={el('video', { url: 'https://evil.io/v.mp4' })} />);
    expect(container.innerHTML).toBe('');
  });
});

describe('button', () => {
  it('drops unsafe hrefs and honours newTab', () => {
    const { container, rerender } = render(<ElementRenderer ctx={ctx()} element={el('button', { label: 'Ir', href: '/eventos', newTab: true })} />);
    expect(screen.getByRole('link', { name: 'Ir' }).getAttribute('target')).toBe('_blank');
    rerender(<ElementRenderer ctx={ctx()} element={el('button', { label: 'Ir', href: 'javascript:alert(1)' })} />);
    expect(container.querySelector('a')).toBeNull();
  });
});

describe('visibility and layout', () => {
  it('renders nothing when hidden on every breakpoint (public)', () => {
    const { container } = render(<ElementRenderer ctx={ctx()} element={el('label', { text: 'X', hidden: { desktop: true, tablet: true, mobile: true } })} />);
    expect(container.innerHTML).toBe('');
  });
  it('hides by breakpoint class and keeps the anchor id', () => {
    const { container } = render(<ElementRenderer ctx={ctx()} element={el('label', { text: 'X', anchor: 'topo', hidden: { mobile: true } })} />);
    const node = container.firstElementChild!;
    expect(node.id).toBe('topo');
    expect(node.className).toContain('hide-m');
  });
  it('columns collapse to one column on mobile unless mobile.cols is set', () => {
    const base = { items: [], style: { desktop: { cols: 3 } } };
    const { container, rerender } = render(<ElementRenderer ctx={ctx()} element={el('columns', base)} />);
    expect(container.firstElementChild!.className).toContain('m-cols-1');
    rerender(<ElementRenderer ctx={ctx()} element={el('columns', { ...base, style: { desktop: { cols: 3 }, mobile: { cols: 2 } } })} />);
    expect(container.firstElementChild!.className).toContain('m-cols-2');
    expect(container.firstElementChild!.className).not.toContain('m-cols-1');
  });
  it('ignores a ratio whose part count does not match the effective cols of that breakpoint', () => {
    const style = { desktop: { cols: 3, ratio: '1-2-1' }, tablet: { ratio: '3-2' }, mobile: { cols: 2, ratio: '1-1-1' } };
    const { container } = render(<ElementRenderer ctx={ctx()} element={el('columns', { items: [], style })} />);
    const cls = container.firstElementChild!.className;
    expect(cls).toContain('ratio-1-2-1');
    expect(cls).not.toContain('t-ratio');
    expect(cls).not.toContain('m-ratio');
  });
  it('a new section gets top and bottom spacing unless the author set padding', () => {
    const { container, rerender } = render(<ElementRenderer ctx={ctx()} element={el('section', { items: [] })} />);
    expect(container.firstElementChild!.className).toContain('pt-l1');
    expect(container.firstElementChild!.className).toContain('pb-l1');
    rerender(<ElementRenderer ctx={ctx()} element={el('section', { items: [], style: { desktop: { p: 'md' } } })} />);
    expect(container.firstElementChild!.className).not.toContain('pt-l1');
    rerender(<ElementRenderer ctx={ctx()} element={el('section', { items: [], style: { desktop: { pt: '0' } } })} />);
    expect(container.firstElementChild!.className).toContain('pt-0');
    expect(container.firstElementChild!.className).not.toContain('pt-l1');
  });
  it('page root is a named container', () => {
    const doc: PageDocumentV2 = { schemaVersion: 2, context: { type: 'none' }, root: { props: {} }, content: [] };
    const { container } = render(<PageRoot document={doc} ctx={ctx()} />);
    expect(container.firstElementChild!.className).toContain('root');
  });
});

describe('event widgets', () => {
  it('eventRail draws cards but not its title; null without data in public, placeholder in editor', () => {
    const rail = el('eventRail', { title: 'Categoria', source: { kind: 'category', id: 'musica' }, limit: 4 });
    const withData = ctx({ resolved: { rails: { [ID(1)]: [event()] }, featured: {}, live: {} } });
    render(<ElementRenderer ctx={withData} element={rail} />);
    expect(screen.getByText('Show A')).toBeTruthy();
    expect(screen.queryByText('Categoria')).toBeNull();
    const { container } = render(<ElementRenderer ctx={ctx()} element={rail} />);
    expect(container.innerHTML).toBe('');
    const ed = render(<ElementRenderer ctx={ctx({ mode: 'editor' })} element={rail} />);
    expect(ed.container.textContent).toContain('Trilho');
  });
  it('liveNow renders from the live bucket of its element, up to the limit', () => {
    const live = ctx({
      resolved: {
        rails: { [ID(1)]: [event({ id: 'x', title: 'Do trilho', isLive: true })] },
        featured: {},
        live: { [ID(1)]: [event({ id: 'a', title: 'Ao A', isLive: true }), event({ id: 'b', title: 'Ao B', isLive: true }), event({ id: 'c', title: 'Ao C', isLive: true })] },
      },
    });
    render(<ElementRenderer ctx={live} element={el('liveNow', { limit: 2, emptyText: 'Nada' })} />);
    expect(screen.getByText('Ao A')).toBeTruthy();
    expect(screen.getByText('Ao B')).toBeTruthy();
    expect(screen.queryByText('Ao C')).toBeNull();
    expect(screen.queryByText('Do trilho')).toBeNull();
  });
  it('featuredEvent renders title and cta, null without data', () => {
    const c = ctx({ resolved: { rails: {}, featured: { [ID(1)]: event({ title: 'Grande Show' }) }, live: {} } });
    render(<ElementRenderer ctx={c} element={el('featuredEvent', { eventId: 'x', ctaLabel: 'Garanta' })} />);
    expect(screen.getByRole('heading', { name: 'Grande Show' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Garanta' })).toBeTruthy();
    const { container } = render(<ElementRenderer ctx={ctx()} element={el('featuredEvent', { eventId: 'x' })} />);
    expect(container.innerHTML).toBe('');
  });
});

describe('v1 parity (converted)', () => {
  it('hero, faq and rail render with their texts and the rail title once', () => {
    const v1 = (parityCases as { input: PageDocument }[])[0]!.input;
    const doc = upgradePageDocument({ ...v1, sections: v1.sections.filter((s) => ['hero', 'faq', 'rail'].includes(s.type)) });
    const railEl = doc.content.flatMap((s) => s.props.items ?? []).find((i) => i.type === 'eventRail')!;
    const resolved = { rails: { [railEl.props.id]: [event({ title: 'Evento Z' })] }, featured: {}, live: {} };
    render(<PageRoot document={doc} ctx={ctx({ resolved })} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Eventos ao vivo' })).toBeTruthy();
    expect(screen.getByText('Novo')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Ver' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Dúvidas' })).toBeTruthy();
    expect(screen.getAllByText('Q?')).toHaveLength(3);
    expect(screen.getAllByText('Categoria')).toHaveLength(1);
    expect(screen.getByText('Evento Z')).toBeTruthy();
  });
});

describe('data widgets in the editor: loading, empty and unavailable', () => {
  const rail = el('eventRail', { title: 'T', source: { kind: 'artist', id: 'Banda Aurora' }, limit: 8 });
  const editor = (over: Partial<RenderContext> = {}) => ctx({ mode: 'editor', ...over });

  it('shows a skeleton with the rail limit while the data loads', () => {
    render(<ElementRenderer ctx={editor({ loading: [ID(1)] })} element={rail} />);
    expect(screen.getByTestId('event-skeleton').querySelectorAll('li')).toHaveLength(8);
  });
  it('a rail with an empty answer explains the filter and that the published page hides it', () => {
    const { rerender } = render(<ElementRenderer ctx={editor({ resolved: { ...empty, rails: { [ID(1)]: [] } } })} element={rail} />);
    expect(screen.getByText('Nenhum evento para este filtro')).toBeInTheDocument();
    rerender(<ElementRenderer ctx={editor({ resolved: { ...empty, rails: { [ID(1)]: [] } } })} element={el('eventRail', { title: 'T', source: { kind: 'category', id: 'MUSIC' }, limit: 4 })} />);
    expect(screen.getByText('Nenhum evento para “MUSIC”')).toBeInTheDocument();
    expect(screen.getByText('Na página publicada este trilho fica oculto até haver eventos.')).toBeInTheDocument();
  });
  it('a rail that was never resolved keeps the plain placeholder', () => {
    render(<ElementRenderer ctx={editor()} element={rail} />);
    expect(screen.getByText('Trilho de eventos')).toBeInTheDocument();
  });
  it('an unavailable featured event (resolved to null) says so; undefined is only "not resolved"', () => {
    const featured = el('featuredEvent', { eventId: ID(7) });
    const { rerender } = render(<ElementRenderer ctx={editor({ resolved: { ...empty, featured: { [ID(1)]: null } } })} element={featured} />);
    expect(screen.getByText('Evento indisponível')).toBeInTheDocument();
    rerender(<ElementRenderer ctx={editor()} element={featured} />);
    expect(screen.getByText('Evento em destaque')).toBeInTheDocument();
  });
  it('draws the editor copy from ctx.labels when the editor hands it', () => {
    const labels = { ...DEFAULT_EDITOR_LABELS, railNoneLive: 'No live events', featuredUnavailable: 'Unavailable' };
    const { rerender } = render(<ElementRenderer ctx={editor({ labels, resolved: { ...empty, rails: { [ID(1)]: [] } } })} element={el('eventRail', { title: 'T', source: { kind: 'live' }, limit: 4 })} />);
    expect(screen.getByText('No live events')).toBeInTheDocument();
    rerender(<ElementRenderer ctx={editor({ labels, resolved: { ...empty, featured: { [ID(1)]: null } } })} element={el('featuredEvent', { eventId: ID(7) })} />);
    expect(screen.getByText('Unavailable')).toBeInTheDocument();
  });
  it('public mode never draws any of this', () => {
    const { container } = render(<ElementRenderer ctx={ctx({ loading: [ID(1)], resolved: { ...empty, rails: { [ID(1)]: [] } } })} element={rail} />);
    expect(container.innerHTML).toBe('');
  });
});
