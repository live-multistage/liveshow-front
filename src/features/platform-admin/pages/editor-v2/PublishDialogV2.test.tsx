import React from 'react';
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
vi.mock('../queries/use-pages', () => ({ usePublishDiffQuery: vi.fn(), usePageVersionsQuery: vi.fn() }));
vi.mock('../mutations/use-page-mutations', () => ({ usePublishPageMutation: vi.fn() }));
const puck = vi.hoisted(() => ({ store: {} as Record<string, any> }));
vi.mock('@puckeditor/core', () => ({ createUsePuck: () => (selector: (s: typeof puck.store) => unknown) => selector(puck.store) }));

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PageDetail, PageDocumentV2 } from '@live-show/api-contracts';
import { usePublishPageMutation } from '../mutations/use-page-mutations';
import { usePageVersionsQuery, usePublishDiffQuery } from '../queries/use-pages';
import { PublishDialogV2 } from './PublishDialogV2';

const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const page = { id: 'A', slug: 'festival', publishedVersion: 3 } as PageDetail;
const doc = (items: unknown[] = []): PageDocumentV2 => ({
  schemaVersion: 2, context: { type: 'none' }, root: { props: {} },
  content: [{ type: 'section', props: { id: U(1), name: 'Abertura', items } }],
} as unknown as PageDocumentV2);
const goodDoc = () => doc([{ type: 'heading', props: { id: U(2), text: 'Olá', tag: 'h2' } }]);
const badDoc = () => doc([{ type: 'button', props: { id: U(3), label: 'Ir', href: 'javascript:alert(1)' } }]);

const diff = { added: 5, removed: 2, edited: 12, hidden: 1, moved: 3, responsiveEdits: 4, hasChanges: true, nextVersionNumber: 4 };
const mutateAsync = vi.fn();
const callbacks = { onClose: vi.fn(), onPublished: vi.fn(), onConflict: vi.fn(), onFeaturedUnavailable: vi.fn() };

function setup(document: PageDocumentV2, extra: { serverIssues?: Record<string, Record<string, string>>; diff?: typeof diff } = {}) {
  vi.mocked(usePublishDiffQuery).mockReturnValue({ data: extra.diff ?? diff, isFetching: false } as never);
  vi.mocked(usePageVersionsQuery).mockReturnValue({ data: [{ number: 3, isLive: true, publishedAt: '2026-11-02T21:40:00Z' }] } as never);
  vi.mocked(usePublishPageMutation).mockReturnValue({ mutateAsync, isPending: false } as never);
  render(<PublishDialogV2 page={page} document={document} serverIssues={extra.serverIssues ?? {}} revision={5} settled {...callbacks} />);
  return userEvent.setup();
}
const confirm = () => screen.getByRole('button', { name: 'Publicar versão 4' });

beforeEach(() => {
  vi.clearAllMocks();
  puck.store = {
    appState: { data: { content: [{ type: 'section', props: { id: U(1), items: [{ type: 'button', props: { id: `button-${U(3)}` } }] } }] } },
    dispatch: vi.fn(),
    getSelectorForId: vi.fn((id: string) => ({ index: 0, zone: `z:${id}` })),
  };
});

describe('PublishDialogV2: ready to publish', () => {
  it('shows version, the four counters of the prototype and the style/moved/data notes', () => {
    setup(goodDoc());
    expect(screen.getByRole('heading', { name: 'Publicar versão 4' })).toBeInTheDocument();
    const counters = screen.getByTestId('publish-counters');
    ['ADICIONADOS', 'EDITADOS', 'REMOVIDOS', 'OCULTOS'].forEach((label) => expect(counters).toHaveTextContent(label));
    expect([...counters.querySelectorAll('b')].map((b) => b.textContent)).toEqual(['5', '12', '2', '1']);
    expect(screen.getByText(/Inclui ajustes de estilo para celular em 4 elementos\./)).toBeInTheDocument();
    expect(screen.getByText(/3 elementos mudaram de lugar\./)).toBeInTheDocument();
    expect(screen.getByText(/Trilhos e destaques usam os eventos do momento/)).toBeInTheDocument();
    expect(screen.queryByText(/seções adicionadas/)).toBeNull();
  });

  it('compares with the live version and says when the page goes live', () => {
    setup(goodDoc());
    expect(screen.getByText(/Comparado com a versão 3 \(no ar desde/)).toBeInTheDocument();
    expect(screen.getByText(/A página fica no ar em até 1 minuto em .*\/p\/festival\./)).toBeInTheDocument();
  });

  it('needs a summary of at most 140 characters before the button enables', async () => {
    const user = setup(goodDoc());
    expect(screen.getByText('0/140')).toBeInTheDocument();
    expect(confirm()).toBeDisabled();
    await user.type(screen.getByLabelText(/Resumo da mudança/), 'Nova seção de números');
    expect(confirm()).toBeEnabled();
    expect(screen.getByLabelText(/Resumo da mudança/)).toHaveAttribute('maxlength', '140');
  });

  it('publishes with the revision held by the editor', async () => {
    mutateAsync.mockResolvedValueOnce({ number: 4 });
    const user = setup(goodDoc());
    await user.type(screen.getByLabelText(/Resumo da mudança/), 'x');
    await user.click(confirm());
    expect(mutateAsync).toHaveBeenCalledWith({ changeSummary: 'x', baseRevision: 5 });
    await waitFor(() => expect(callbacks.onPublished).toHaveBeenCalledWith(4));
  });

  it('a FEATURED_UNAVAILABLE refusal hands the element to the editor instead of a generic error', async () => {
    mutateAsync.mockRejectedValueOnce({ featuredUnavailable: { code: 'FEATURED_UNAVAILABLE', elementId: U(9) } });
    const user = setup(goodDoc());
    await user.type(screen.getByLabelText(/Resumo da mudança/), 'x');
    await user.click(confirm());
    await waitFor(() => expect(callbacks.onFeaturedUnavailable).toHaveBeenCalledWith(U(9)));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('a conflict goes to the editor; another failure shows the generic message', async () => {
    mutateAsync.mockRejectedValueOnce({ conflict: { code: 'DRAFT_CONFLICT' } }).mockRejectedValueOnce(new Error('x'));
    const user = setup(goodDoc());
    await user.type(screen.getByLabelText(/Resumo da mudança/), 'x');
    await user.click(confirm());
    await waitFor(() => expect(callbacks.onConflict).toHaveBeenCalled());
    await user.click(confirm());
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível publicar');
  });
});

describe('PublishDialogV2: with errors', () => {
  it('titles the count, lists the errors, keeps publish disabled and offers to close', () => {
    setup(badDoc());
    expect(screen.getByRole('heading', { name: 'Corrija 1 erro antes de publicar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Botão em Abertura:/ })).toBeInTheDocument();
    expect(screen.getByText('O rascunho continua salvo. Clique num erro para ir até o elemento.')).toBeInTheDocument();
    expect(confirm()).toBeDisabled();
    expect(screen.queryByTestId('publish-counters')).toBeNull();
  });

  it('clicking an error selects that element (Puck id with its prefix) and closes', async () => {
    const user = setup(badDoc());
    await user.click(screen.getByRole('button', { name: /Botão em Abertura:/ }));
    expect(puck.store.getSelectorForId).toHaveBeenCalledWith(`button-${U(3)}`);
    expect(puck.store.dispatch).toHaveBeenCalledWith({ type: 'setUi', ui: { itemSelector: { index: 0, zone: `z:button-${U(3)}` } } });
    expect(callbacks.onClose).toHaveBeenCalled();
  });

  it('an issue the back reported counts as an error and is listed', () => {
    setup(goodDoc(), { serverIssues: { [U(2)]: { eventId: 'Evento indisponível' } } });
    expect(screen.getByRole('heading', { name: 'Corrija 1 erro antes de publicar' })).toBeInTheDocument();
    expect(screen.getByText(/Evento indisponível/)).toBeInTheDocument();
  });
});
