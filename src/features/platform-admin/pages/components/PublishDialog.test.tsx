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
vi.mock('../queries/use-pages', () => ({ usePublishDiffQuery: vi.fn() }));
vi.mock('../mutations/use-page-mutations', () => ({ usePublishPageMutation: vi.fn() }));

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PageDetail } from '@live-show/api-contracts';
import { usePublishPageMutation } from '../mutations/use-page-mutations';
import { usePublishDiffQuery } from '../queries/use-pages';
import { PublishDialog } from './PublishDialog';

const page = { id: 'A', slug: 'festival', publishedVersion: 3 } as PageDetail;
const mutateAsync = vi.fn();
const diff = { added: 2, removed: 0, edited: 3, hidden: 1, hasChanges: true, nextVersionNumber: 4 };
const callbacks = { onClose: vi.fn(), onPublished: vi.fn(), onConflict: vi.fn() };

function setup(props: { settled?: boolean; data?: typeof diff; isFetching?: boolean } = {}) {
  vi.mocked(usePublishDiffQuery).mockReturnValue({ data: props.data ?? diff, isFetching: props.isFetching ?? false } as never);
  vi.mocked(usePublishPageMutation).mockReturnValue({ mutateAsync, isPending: false } as never);
  render(<PublishDialog page={page} revision={5} settled={props.settled ?? true} {...callbacks} />);
  return userEvent.setup();
}
const confirm = () => screen.getByRole('button', { name: /^Publicar versão 4$/ });

beforeEach(() => { vi.clearAllMocks(); });

describe('PublishDialog', () => {
  it('shows the counts and keeps publish disabled until a summary is typed', async () => {
    const user = setup();
    expect(screen.getByRole('heading', { name: 'Publicar versão 4' })).toBeInTheDocument();
    expect(screen.getByText('2 seções adicionadas · 3 editadas · 1 oculta')).toBeInTheDocument();
    expect(confirm()).toBeDisabled();
    await user.type(screen.getByLabelText(/Resumo da mudança/), '   ');
    expect(confirm()).toBeDisabled();
    await user.type(screen.getByLabelText(/Resumo da mudança/), 'Adiciona o FAQ');
    expect(confirm()).toBeEnabled();
  });

  it('shows the nothing-changed state and blocks publishing', () => {
    setup({ data: { ...diff, hasChanges: false, added: 0, edited: 0, hidden: 0 } });
    expect(screen.getByText('Nada mudou desde a versão 3.')).toBeInTheDocument();
    expect(confirm()).toBeDisabled();
  });

  it('ignores a cached diff while it refetches', async () => {
    const user = setup({ isFetching: true });
    await user.type(screen.getByLabelText(/Resumo da mudança/), 'Algo');
    expect(screen.queryByText(/adicionadas/)).not.toBeInTheDocument();
    expect(confirm()).toBeDisabled();
  });

  it('waits for the autosave before allowing publish', async () => {
    const user = setup({ settled: false });
    await user.type(screen.getByLabelText(/Resumo da mudança/), 'Algo');
    expect(screen.getByText('Salvando o rascunho…')).toBeInTheDocument();
    expect(confirm()).toBeDisabled();
  });

  it('publishes with the summary and the current revision, then reports the version', async () => {
    mutateAsync.mockResolvedValue({ number: 4 });
    const user = setup();
    await user.type(screen.getByLabelText(/Resumo da mudança/), '  Adiciona o FAQ ');
    await user.click(confirm());
    await waitFor(() => expect(callbacks.onPublished).toHaveBeenCalledWith(4));
    expect(mutateAsync).toHaveBeenCalledWith({ changeSummary: 'Adiciona o FAQ', baseRevision: 5 });
  });

  it('hands a draft conflict to the editor', async () => {
    const conflict = { code: 'DRAFT_CONFLICT', currentRevision: 6, updatedBy: null, updatedAt: '2026-11-05T14:35:00' };
    mutateAsync.mockRejectedValue({ status: 409, message: 'x', conflict });
    const user = setup();
    await user.type(screen.getByLabelText(/Resumo da mudança/), 'Algo');
    await user.click(confirm());
    await waitFor(() => expect(callbacks.onConflict).toHaveBeenCalledWith(conflict));
  });
});
