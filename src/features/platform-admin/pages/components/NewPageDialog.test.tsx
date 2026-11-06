import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PageDetail, PageSummary } from '@live-show/api-contracts';
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
vi.mock('../services/pages.service', () => ({ pagesService: { create: vi.fn() } }));
vi.mock('@/lib/http/errors', async (orig) => ({ ...(await orig<object>()), normalizeError: (e: unknown) => e }));

import { pagesService } from '../services/pages.service';
import { NewPageDialog } from './NewPageDialog';

const create = vi.mocked(pagesService.create);
const existing = { id: '11111111-1111-4111-8111-111111111111', title: 'Festival de Verão 2027', slug: 'festival-de-verao' } as PageSummary;

function renderDialog() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}><NewPageDialog open onOpenChange={() => {}} pages={[existing]} /></QueryClientProvider>,
  );
}
const type = (el: HTMLElement, value: string) => fireEvent.change(el, { target: { value } });
const titleInput = () => screen.getByLabelText(/^Título/);
const slugInput = () => screen.getByLabelText('Endereço');

beforeEach(() => { vi.clearAllMocks(); });

describe('NewPageDialog', () => {
  it('derives the slug from the title and shows the counter', async () => {
    renderDialog();
    type(titleInput(), 'Festival de Inverno 2027');
    expect(slugInput()).toHaveValue('festival-de-inverno-2027');
    expect(screen.getByText('24/80')).toBeInTheDocument();
  });

  it('stops deriving once the slug is edited by hand', async () => {
    renderDialog();
    type(titleInput(), 'Abc');
    type(slugInput(), 'meu-slug');
    type(titleInput(), 'Abc def');
    expect(slugInput()).toHaveValue('meu-slug');
  });

  it('flags reserved and malformed slugs inline and blocks submit', async () => {
    renderDialog();
    type(titleInput(), 'Admin');
    type(slugInput(), 'admin');
    expect(screen.getByText('Esse endereço é reservado pela plataforma.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar e abrir editor' })).toBeDisabled();
    type(slugInput(), 'Bad Slug');
    expect(screen.getByText('Use só letras minúsculas, números e hífen.')).toBeInTheDocument();
  });

  it('shows the server 409 as slug taken', async () => {
    create.mockRejectedValue({ status: 409, message: 'conflict' });
    renderDialog();
    type(titleInput(), 'Festival de Verão 2027');
    await userEvent.click(screen.getByRole('button', { name: 'Criar e abrir editor' }));
    expect(await screen.findByText('Esse endereço já está em uso.')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('sends duplicateFromPageId and navigates to the editor on success', async () => {
    create.mockResolvedValue({ id: 'new-id' } as PageDetail);
    renderDialog();
    type(titleInput(), 'Cópia');
    await userEvent.click(screen.getByRole('radio', { name: /Duplicar página existente/ }));
    await userEvent.selectOptions(screen.getByLabelText('Página para duplicar'), existing.id);
    await userEvent.click(screen.getByRole('button', { name: 'Criar e abrir editor' }));
    await waitFor(() => expect(create).toHaveBeenCalledWith({ title: 'Cópia', slug: 'copia', duplicateFromPageId: existing.id }));
    expect(push).toHaveBeenCalledWith('/dashboard/platform/pages/new-id');
  });

  it('omits duplicateFromPageId for a blank page', async () => {
    create.mockResolvedValue({ id: 'x' } as PageDetail);
    renderDialog();
    type(titleInput(), 'Cópia');
    await userEvent.click(screen.getByRole('button', { name: 'Criar e abrir editor' }));
    await waitFor(() => expect(create).toHaveBeenCalledWith({ title: 'Cópia', slug: 'copia' }));
  });
});
