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
vi.mock('../queries/use-pages', () => ({ usePageVersionsQuery: vi.fn() }));
vi.mock('../mutations/use-page-mutations', () => ({ useRestoreVersionMutation: vi.fn() }));

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PageDetail } from '@live-show/api-contracts';
import { useRestoreVersionMutation } from '../mutations/use-page-mutations';
import { usePageVersionsQuery } from '../queries/use-pages';
import { HistoryDrawer } from './HistoryDrawer';

const page = { id: 'A', draftUpdatedAt: '2026-11-05T14:32:00', hasUnpublishedChanges: true } as PageDetail;
const versions = [
  { number: 3, changeSummary: 'Adiciona o FAQ', publishedAt: '2026-11-05T14:40:00', publishedBy: { id: 'u', name: 'Ana Souza' }, isLive: true },
  { number: 2, changeSummary: 'Troca o hero', publishedAt: '2026-11-01T10:00:00', publishedBy: null, isLive: false },
];
const mutateAsync = vi.fn();
const onClose = vi.fn();
const onRestored = vi.fn();

function setup() {
  vi.mocked(usePageVersionsQuery).mockReturnValue({ data: versions, isLoading: false, isError: false } as never);
  vi.mocked(useRestoreVersionMutation).mockReturnValue({ mutateAsync, isPending: false } as never);
  render(<HistoryDrawer page={page} onClose={onClose} onRestored={onRestored} />);
  return userEvent.setup();
}

beforeEach(() => { vi.clearAllMocks(); });

describe('HistoryDrawer', () => {
  it('lists versions, marks the live one and offers restore only on the others', () => {
    setup();
    expect(screen.getByText('Adiciona o FAQ')).toBeInTheDocument();
    expect(screen.getByText('Ana Souza')).toBeInTheDocument();
    expect(screen.getByText('NO AR')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Restaurar no rascunho' })).toHaveLength(1);
  });

  it('confirms, restores the version and hands control back to the editor', async () => {
    mutateAsync.mockResolvedValue({});
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Restaurar no rascunho' }));
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText('Restaurar a versão 2 no rascunho?')).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: 'Restaurar' }));
    await waitFor(() => expect(onRestored).toHaveBeenCalled());
    expect(mutateAsync).toHaveBeenCalledWith(2);
  });
});
