import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ptMessages from '../../../../../shared/i18n-messages/pt.json';

// next-intl stand-in reading the real pt.json, so the copy is exercised for real.
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
    return typeof template === 'string'
      ? template.replace(/\{(\w+)\}/g, (_, n) => String(values?.[n] ?? ''))
      : key;
  },
}));
vi.mock('../queries/use-pages', () => ({ usePageQuery: vi.fn() }));
vi.mock('../services/pages.service', () => ({
  pagesService: { saveDraft: vi.fn() },
  isDraftConflict: (e: { response?: { status?: number; data?: { code?: string } } }) =>
    e?.response?.status === 409 && e.response.data?.code === 'DRAFT_CONFLICT',
}));

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { createEmptyDocument, createEmptySection, type PageDetail, type PageSection } from '@live-show/api-contracts';
import { usePageQuery } from '../queries/use-pages';
import { pagesService } from '../services/pages.service';
import { PageEditorPage } from './PageEditorPage';

const saveDraft = vi.mocked(pagesService.saveDraft);

const uuid = (n: number) => `${String(n).padStart(8, '0')}-0000-4000-8000-000000000000`;
const detail = (revision: number, titles: string[]): PageDetail => ({
  id: 'A', title: 'Página A', slug: 'a', kind: 'STANDALONE', status: 'PUBLISHED', hasUnpublishedChanges: false,
  publishedVersion: 3, draftUpdatedAt: '2026-11-05T14:32:00', draftUpdatedBy: null, sectionCount: titles.length,
  draftRevision: revision, seo: { noindex: false },
  draft: {
    ...createEmptyDocument(),
    sections: titles.map((title, i) => {
      const base = createEmptySection('text', uuid(i + 1));
      return { ...base, props: { ...base.props, title, paragraphs: [[{ text: 'Corpo' }]] } } as PageSection;
    }),
  },
});

let current = detail(1, ['Alpha', 'Beta']);
const refetch = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  saveDraft.mockReset();
  refetch.mockReset();
  current = detail(1, ['Alpha', 'Beta']);
  vi.mocked(usePageQuery).mockImplementation((() => ({ data: current, isError: false, error: null, refetch })) as never);
  window.matchMedia = vi.fn().mockImplementation(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })) as never;
});
afterEach(() => vi.useRealTimers());

const rows = () => screen.getAllByTestId('section-row');
const conflict = { response: { status: 409, data: { code: 'DRAFT_CONFLICT', currentRevision: 9, updatedBy: { id: 'u', name: 'Ana Souza' }, updatedAt: '2026-11-05T14:35:00' } } };

async function editIntoConflict() {
  saveDraft.mockRejectedValue(conflict);
  render(<PageEditorPage pageId="A" />);
  fireEvent.click(within(rows()[0]).getByRole('button', { name: /Ocultar/ }));
  await act(async () => { await vi.advanceTimersByTimeAsync(900); });
}

describe('PageEditorPage conflict reload', () => {
  it('locks on a conflict, then reloads into a fresh editor with the new revision and without local edits', async () => {
    await editIntoConflict();
    expect(screen.getByRole('alert')).toHaveTextContent('Ana Souza salvou este rascunho');
    expect(within(rows()[0]).getByRole('button', { name: /Mostrar|Ocultar/ })).toBeDisabled();

    current = detail(9, ['Alpha', 'Beta', 'Nova']);
    refetch.mockResolvedValue({ isError: false, data: current });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Recarregar' })); });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(rows()).toHaveLength(3);
    expect(within(rows()[0]).getByRole('button', { name: /Ocultar/ })).toBeEnabled();

    saveDraft.mockReset().mockResolvedValue({ draftRevision: 10, draftUpdatedAt: '2026-11-05T15:00:00' });
    fireEvent.click(within(rows()[0]).getByRole('button', { name: /Ocultar/ }));
    await act(async () => { await vi.advanceTimersByTimeAsync(900); });
    expect(saveDraft.mock.calls[0][1]).toMatchObject({ baseRevision: 9 });
  });

  it('stays locked with a message when the refetch fails', async () => {
    await editIntoConflict();
    refetch.mockResolvedValue({ isError: true, data: current });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Recarregar' })); });
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível recarregar');
    expect(within(rows()[0]).getByRole('button', { name: /Mostrar|Ocultar/ })).toBeDisabled();
  });

  it('offers a retry next to the save indicator when saving fails', async () => {
    saveDraft.mockRejectedValue({ response: { status: 500 } });
    render(<PageEditorPage pageId="A" />);
    fireEvent.click(within(rows()[0]).getByRole('button', { name: /Ocultar/ }));
    await act(async () => { await vi.advanceTimersByTimeAsync(900); });
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
  });
});
