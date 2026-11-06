import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PageSummary } from '@live-show/api-contracts';
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
    return typeof template === 'string'
      ? template.replace(/\{(\w+)\}/g, (_, n) => String(values?.[n] ?? ''))
      : key;
  },
}));
const push = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
vi.mock('../services/pages.service', () => ({ pagesService: { list: vi.fn(), create: vi.fn() } }));

import { pagesService } from '../services/pages.service';
import { PagesListPage } from './PagesListPage';

const list = vi.mocked(pagesService.list);

const page = (over: Partial<PageSummary>): PageSummary => ({
  id: 'p1', title: 'Festival de Verão 2027', slug: 'festival-de-verao', kind: 'STANDALONE', status: 'PUBLISHED',
  hasUnpublishedChanges: false, publishedVersion: 3, draftUpdatedAt: '2026-11-05T14:32:00.000Z',
  draftUpdatedBy: { id: 'u1', name: 'Ana Souza' }, sectionCount: 7, ...over,
});
const PAGES = [
  page({ hasUnpublishedChanges: true }),
  page({ id: 'p2', title: 'Black Friday de ingressos', slug: 'black-friday', status: 'DRAFT', publishedVersion: null, hasUnpublishedChanges: true, draftUpdatedBy: null }),
  page({ id: 'p3', title: 'Conferência TechLive 2026', slug: 'techlive-2026', status: 'ARCHIVED' }),
];

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><PagesListPage /></QueryClientProvider>);
}

beforeEach(() => { vi.clearAllMocks(); list.mockResolvedValue(PAGES); });

describe('PagesListPage', () => {
  it('renders rows with status, unpublished-changes pill, live version and editor', async () => {
    renderPage();
    const row = (await screen.findByText('Festival de Verão 2027')).closest('tr')!;
    expect(within(row).getByText('/p/festival-de-verao')).toBeInTheDocument();
    expect(within(row).getByText('PUBLICADA')).toBeInTheDocument();
    expect(within(row).getByText('ALTERAÇÕES NÃO PUBLICADAS')).toBeInTheDocument();
    expect(within(row).getByText('v3')).toBeInTheDocument();
    expect(within(row).getByText('Ana Souza')).toBeInTheDocument();
    expect(screen.getAllByText('ALTERAÇÕES NÃO PUBLICADAS')).toHaveLength(1);
    expect(screen.getByText('3 de 3 páginas')).toBeInTheDocument();
  });

  it('opens the public page in a new tab only for published pages', async () => {
    renderPage();
    await screen.findByText('Festival de Verão 2027');
    const links = screen.getAllByRole('link', { name: /Ver página pública/ });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', '/p/festival-de-verao');
    expect(links[0]).toHaveAttribute('target', '_blank');
  });

  it('navigates to the editor when a row is clicked', async () => {
    renderPage();
    await userEvent.click(await screen.findByText('/p/black-friday'));
    expect(push).toHaveBeenCalledWith('/dashboard/platform/pages/p2');
  });

  it('filters by status chip and by search', async () => {
    renderPage();
    await screen.findByText('Festival de Verão 2027');
    await userEvent.click(screen.getByRole('button', { name: 'Rascunhos' }));
    expect(screen.queryByText('Festival de Verão 2027')).not.toBeInTheDocument();
    expect(screen.getByText('1 de 3 páginas')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Todas' }));
    fireEvent.change(screen.getByLabelText('Buscar páginas'), { target: { value: 'techlive' } });
    expect(screen.getByText('Conferência TechLive 2026')).toBeInTheDocument();
    expect(screen.queryByText('Black Friday de ingressos')).not.toBeInTheDocument();
  });

  it('shows no-results state and clears the search', async () => {
    renderPage();
    await screen.findByText('Festival de Verão 2027');
    fireEvent.change(screen.getByLabelText('Buscar páginas'), { target: { value: 'inverno' } });
    expect(screen.getByText('Nenhuma página encontrada para “inverno”.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Limpar busca' }));
    expect(screen.getByText('Festival de Verão 2027')).toBeInTheDocument();
  });

  it('with an empty search and a status without pages, shows a status message and returns to Todas', async () => {
    list.mockResolvedValue([page({})]);
    renderPage();
    await screen.findByText('Festival de Verão 2027');
    await userEvent.click(screen.getByRole('button', { name: 'Arquivadas' }));
    expect(screen.getByText('Nenhuma página com esse status.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Limpar busca' }));
    expect(screen.getByText('Festival de Verão 2027')).toBeInTheDocument();
  });

  it('resets the new-page dialog after cancelling and reopening', async () => {
    renderPage();
    await screen.findByText('Festival de Verão 2027');
    await userEvent.click(screen.getByRole('button', { name: 'Nova página' }));
    fireEvent.change(screen.getByLabelText(/^Título/), { target: { value: 'Abc' } });
    fireEvent.change(screen.getByLabelText('Endereço'), { target: { value: 'manual' } });
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Nova página' }));
    expect(screen.getByLabelText(/^Título/)).toHaveValue('');
    expect(screen.getByLabelText('Endereço')).toHaveValue('');
    fireEvent.change(screen.getByLabelText(/^Título/), { target: { value: 'Novo' } });
    expect(screen.getByLabelText('Endereço')).toHaveValue('novo');
  });

  it('shows the empty state with a CTA that opens the dialog', async () => {
    list.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('Nenhuma página ainda')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Criar a primeira página/ }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('shows the error state and retries', async () => {
    list.mockRejectedValueOnce(new Error('boom'));
    renderPage();
    expect(await screen.findByText('Não foi possível carregar as páginas.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByText('Festival de Verão 2027')).toBeInTheDocument();
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
  });
});
