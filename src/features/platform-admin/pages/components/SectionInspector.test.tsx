import React, { useReducer } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ptMessages from '../../../../../shared/i18n-messages/pt.json';

function resolve(namespace: string, key: string): unknown {
  let node: unknown = ptMessages;
  for (const segment of [...namespace.split('.'), ...key.split('.')]) {
    node = node && typeof node === 'object' ? (node as Record<string, unknown>)[segment] : undefined;
    if (node === undefined) return undefined;
  }
  return node;
}
vi.mock('next-intl', () => ({
  useLocale: () => 'pt',
  useTranslations: (namespace: string) => (key: string, values?: Record<string, unknown>) => {
    const template = resolve(namespace, key);
    return typeof template === 'string' ? template.replace(/\{(\w+)\}/g, (_, n) => String(values?.[n] ?? '')) : key;
  },
}));

// The spy returns a plain outcome ({ url } or { error }) instead of a promise: vitest reports rejected promises
// returned by a spy as unhandled even when the caller awaits them.
const upload = vi.fn<(file: File) => { url: string } | { error: unknown }>();
const mutateAsync = async (file: File) => {
  const outcome = upload(file);
  if ('error' in outcome) throw outcome.error;
  return outcome;
};
vi.mock('../mutations/use-page-mutations', () => ({
  useUploadPageAssetMutation: () => ({ mutateAsync, isPending: false }),
}));
vi.mock('../../mailing/components/OrganizationPicker', () => ({
  OrganizationPicker: ({ onChange }: { onChange(id: string): void }) => <button onClick={() => onChange('org-1')}>pick-org</button>,
}));
vi.mock('../../mailing/components/ArtistPicker', () => ({
  ArtistPicker: ({ onChange }: { onChange(id: string): void }) => <button onClick={() => onChange('art-1')}>pick-artist</button>,
}));
vi.mock('../../mailing/components/EventPicker', () => ({
  EventPicker: ({ onChange }: { onChange(ids: string[]): void }) => <button onClick={() => onChange(['ev-1'])}>pick-event</button>,
}));

import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createEmptyDocument, createEmptySection, type PageSection, type PageSectionType } from '@live-show/api-contracts';
import { createEditorState, pageEditorReducer, selectInvalidSections } from '../hooks/page-editor-reducer';
import { SectionInspector } from './SectionInspector';

const ID = '11111111-1111-4111-8111-111111111111';

let latest: PageSection;
function Harness({ initial }: { initial: PageSection }) {
  const [state, dispatch] = useReducer(pageEditorReducer, { ...createEmptyDocument(), sections: [initial] }, createEditorState);
  const section = state.document.sections[0];
  latest = section;
  const issues = selectInvalidSections(state.document)[section.id] ?? [];
  return <SectionInspector section={section} index={0} issues={issues} locked={false} dispatch={dispatch} />;
}

const mount = (type: PageSectionType, props: Record<string, unknown> = {}) => {
  const base = createEmptySection(type, ID) as PageSection;
  return render(<Harness initial={{ ...base, props: { ...base.props, ...props } } as PageSection} />);
};

beforeEach(() => upload.mockReset());

describe('SectionInspector', () => {
  it('shows the section type in the header', () => {
    mount('hero', { title: 'Oi' });
    expect(screen.getByText('Hero · SEÇÃO 01')).toBeInTheDocument();
  });

  it('editing the title updates the document', async () => {
    const user = userEvent.setup();
    mount('hero', { title: '' });
    await user.type(screen.getByLabelText(/^Título/), 'Olá');
    expect((latest.props as { title: string }).title).toBe('Olá');
    expect(screen.getByText('3/90')).toBeInTheDocument();
  });

  it('flags an empty required field inline and clears it when filled', async () => {
    const user = userEvent.setup();
    mount('hero', { title: '' });
    expect(screen.getByText('Obrigatório.')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Título/)).toHaveAttribute('aria-invalid', 'true');
    await user.type(screen.getByLabelText(/^Título/), 'x');
    expect(screen.queryByText('Obrigatório.')).not.toBeInTheDocument();
  });

  it('flags an invalid CTA link', async () => {
    const user = userEvent.setup();
    mount('hero', { title: 'Oi' });
    await user.type(screen.getByLabelText('Botão principal'), 'Ver');
    await user.type(screen.getByLabelText('Link do botão principal'), 'javascript:alert(1)');
    expect(screen.getByText('Use um link https://, /caminho ou #âncora.')).toBeInTheDocument();
    expect(latest.props).toMatchObject({ primaryCta: { label: 'Ver', href: 'javascript:alert(1)' } });
  });

  it('drops an empty CTA pair', async () => {
    const user = userEvent.setup();
    mount('hero', { title: 'Oi', primaryCta: { label: 'a', href: '/x' } });
    await user.clear(screen.getByLabelText('Botão principal'));
    await user.clear(screen.getByLabelText('Link do botão principal'));
    expect((latest.props as { primaryCta?: unknown }).primaryCta).toBeUndefined();
  });

  it('parses a list textarea into items and keeps untouched fields', () => {
    mount('features', { title: 'T', items: [{ icon: 'star', title: 'A', text: 'b' }, { title: 'C', text: 'd' }] });
    fireEvent.change(screen.getByLabelText(/^Itens/), { target: { value: 'A — b\nC — d\nE — f — g' } });
    expect((latest.props as { items: unknown[] }).items).toEqual([
      { icon: 'star', title: 'A', text: 'b' }, { title: 'C', text: 'd' }, { title: 'E', text: 'f — g' },
    ]);
  });

  it('parses the text body into runs', () => {
    mount('text', { paragraphs: [[{ text: 'x' }]] });
    fireEvent.change(screen.getByLabelText(/^Texto/), { target: { value: 'oi **você**\n\nfim' } });
    expect((latest.props as { paragraphs: unknown[] }).paragraphs).toEqual([
      [{ text: 'oi ' }, { text: 'você', bold: true }], [{ text: 'fim' }],
    ]);
  });

  it('writes audience counters from number/label pairs', async () => {
    const user = userEvent.setup();
    mount('audience', { text: 'Oi', counters: [] });
    await user.type(screen.getByLabelText('Número 1'), '120+');
    await user.type(screen.getByLabelText('Rótulo 1'), 'EVENTOS');
    expect((latest.props as { counters: unknown[] }).counters).toEqual([{ value: '120+', label: 'EVENTOS' }]);
  });

  it('rejects an invalid upload without calling the service', () => {
    mount('media', { url: '', alt: 'x' });
    const file = new File(['x'], 'a.gif', { type: 'image/gif' });
    fireEvent.change(screen.getByLabelText('Enviar imagem'), { target: { files: [file] } });
    expect(screen.getByRole('alert')).toHaveTextContent('Envie uma imagem PNG, JPG ou WebP de até 5 MB.');
    expect(upload).not.toHaveBeenCalled();
  });

  it('rejects an oversized upload without calling the service', () => {
    mount('media', { url: '', alt: 'x' });
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 });
    fireEvent.change(screen.getByLabelText('Enviar imagem'), { target: { files: [file] } });
    expect(screen.getByRole('alert')).toHaveTextContent('até 5 MB');
    expect(upload).not.toHaveBeenCalled();
  });

  it('stores the uploaded url', async () => {
    upload.mockReturnValue({ url: 'https://cdn.showon.io/a.png' });
    mount('media', { url: '', alt: 'x' });
    fireEvent.change(screen.getByLabelText('Enviar imagem'), { target: { files: [new File(['x'], 'a.png', { type: 'image/png' })] } });
    await screen.findByDisplayValue('https://cdn.showon.io/a.png');
    expect((latest.props as { url: string }).url).toBe('https://cdn.showon.io/a.png');
  });

  it.each([
    [413, undefined],
    [400, 'INVALID_ASSET'],
  ])('maps server rejection %s %s to the upload message', async (status, code) => {
    upload.mockReturnValue({ error: Object.assign(new Error('rejected'), { status, code }) });
    mount('media', { url: '', alt: 'x' });
    fireEvent.change(screen.getByLabelText('Enviar imagem'), { target: { files: [new File(['x'], 'a.png', { type: 'image/png' })] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('Envie uma imagem PNG, JPG ou WebP de até 5 MB.');
  });

  it('rail: switches source, picks an entity and the limit', async () => {
    const user = userEvent.setup();
    mount('rail', { title: 'T' });
    await user.click(screen.getByRole('button', { name: 'Organização' }));
    await user.click(screen.getByText('pick-org'));
    expect((latest.props as { source: unknown }).source).toEqual({ kind: 'organization', id: 'org-1' });
    await user.click(screen.getByRole('button', { name: '12' }));
    expect((latest.props as { limit: number }).limit).toBe(12);
    await user.click(screen.getByRole('button', { name: 'Ao vivo agora' }));
    expect((latest.props as { source: unknown }).source).toEqual({ kind: 'live' });
  });

  it('featured: stores the picked event id', async () => {
    const user = userEvent.setup();
    mount('featured');
    await user.click(screen.getByText('pick-event'));
    expect((latest.props as { eventId: string }).eventId).toBe('ev-1');
  });

  it('appearance segments and visibility switch update the section', async () => {
    const user = userEvent.setup();
    mount('hero', { title: 'Oi' });
    await user.click(screen.getByRole('button', { name: 'Destaque' }));
    await user.click(screen.getByRole('button', { name: 'Amplo' }));
    await user.click(screen.getByRole('button', { name: 'Só celular' }));
    expect(latest.appearance).toEqual({ background: 'accent', spacing: 'wide', showOn: 'mobile' });
    await user.click(screen.getByRole('switch', { name: 'Seção visível na página' }));
    expect(latest.hidden).toBe(true);
  });

  it('shows items the line format cannot hold as read-only with a warning', () => {
    mount('features', { title: 'T', items: [{ title: 'A — B', text: 'c' }, { title: 'D', text: 'e' }] });
    const field = screen.getByLabelText(/^Itens/);
    expect(field).toHaveAttribute('readonly');
    expect(screen.getByText(/não pode ser editado aqui/)).toBeInTheDocument();
    fireEvent.change(field, { target: { value: 'X — y' } });
    expect((latest.props as { items: unknown[] }).items).toHaveLength(2);
  });

  it('keeps both audience slots in place while one is emptied', async () => {
    const user = userEvent.setup();
    mount('audience', { text: 'Oi', counters: [{ value: '1', label: 'A' }, { value: '2', label: 'B' }] });
    await user.clear(screen.getByLabelText('Número 1'));
    await user.clear(screen.getByLabelText('Rótulo 1'));
    expect(screen.getByLabelText('Número 2')).toHaveValue('2');
    expect(screen.getByLabelText('Número 1')).toHaveValue('');
    expect((latest.props as { counters: unknown[] }).counters).toEqual([{ value: '2', label: 'B' }]);
  });

  it('resyncs a list field when the document changes from outside, unless it is focused', () => {
    const props = { title: 'T', items: [{ title: 'A', text: 'a' }, { title: 'B', text: 'b' }] };
    const base = createEmptySection('features', ID) as PageSection;
    const make = (items: unknown) => ({ ...base, props: { ...props, items } }) as PageSection;
    const view = (section: PageSection) => (
      <SectionInspector section={section} index={0} issues={[]} locked={false} dispatch={() => {}} />
    );
    const { rerender } = render(view(make(props.items)));
    rerender(view(make([{ title: 'Z', text: 'z' }])));
    expect(screen.getByLabelText(/^Itens/)).toHaveValue('Z — z');
    const field = screen.getByLabelText(/^Itens/);
    field.focus();
    fireEvent.change(field, { target: { value: 'typing' } });
    rerender(view(make([{ title: 'Q', text: 'q' }])));
    expect(field).toHaveValue('typing');
  });
});
