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
vi.mock('../mutations/use-page-mutations', () => ({
  useUpdatePageSettingsMutation: vi.fn(),
  useUnpublishPageMutation: vi.fn(),
  useArchivePageMutation: vi.fn(),
  useUnarchivePageMutation: vi.fn(),
}));

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PageDetail } from '@live-show/api-contracts';
import * as mutations from '../mutations/use-page-mutations';
import { PageSettingsDrawer } from './PageSettingsDrawer';

const page = {
  id: 'A', title: 'Festival', slug: 'festival', status: 'PUBLISHED', publishedVersion: 3,
  seo: { noindex: false },
} as PageDetail;
const update = vi.fn();
const unpublish = vi.fn();
const onClose = vi.fn();

function setup(overrides: Partial<PageDetail> = {}) {
  const idle = { isPending: false };
  vi.mocked(mutations.useUpdatePageSettingsMutation).mockReturnValue({ ...idle, mutateAsync: update } as never);
  vi.mocked(mutations.useUnpublishPageMutation).mockReturnValue({ ...idle, mutateAsync: unpublish } as never);
  vi.mocked(mutations.useArchivePageMutation).mockReturnValue({ ...idle, mutateAsync: vi.fn() } as never);
  vi.mocked(mutations.useUnarchivePageMutation).mockReturnValue({ ...idle, mutateAsync: vi.fn() } as never);
  render(<PageSettingsDrawer page={{ ...page, ...overrides }} onClose={onClose} />);
  return userEvent.setup();
}
const save = () => screen.getByRole('button', { name: 'Salvar configurações' });

beforeEach(() => { vi.clearAllMocks(); });

describe('PageSettingsDrawer', () => {
  it('sends only the changed fields', async () => {
    update.mockResolvedValue({});
    const user = setup();
    await user.clear(screen.getByLabelText('Título'));
    await user.type(screen.getByLabelText('Título'), 'Festival 2027');
    await user.click(save());
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(update).toHaveBeenCalledWith({ title: 'Festival 2027' });
  });

  it('sends the seo object when any seo field changes', async () => {
    update.mockResolvedValue({});
    const user = setup();
    await user.type(screen.getByLabelText(/Título para buscadores/), 'Festival ao vivo');
    await user.click(screen.getByRole('switch', { name: 'Não indexar nos buscadores' }));
    await user.click(save());
    await waitFor(() => expect(update).toHaveBeenCalledWith({ seo: { title: 'Festival ao vivo', noindex: true } }));
  });

  it('blocks a reserved or malformed slug without calling the API', async () => {
    const user = setup();
    const slug = screen.getByLabelText('Endereço');
    await user.clear(slug);
    await user.type(slug, 'admin');
    await user.click(save());
    expect(screen.getByText('Esse endereço é reservado pela plataforma.')).toBeInTheDocument();
    await user.clear(slug);
    await user.type(slug, 'Com Espaço');
    await user.click(save());
    expect(screen.getByText('Use só letras minúsculas, números e hífen.')).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();
  });

  it('shows the in-use message on a 409', async () => {
    update.mockRejectedValue({ status: 409, message: 'x' });
    const user = setup();
    const slug = screen.getByLabelText('Endereço');
    await user.clear(slug);
    await user.type(slug, 'ocupado');
    await user.click(save());
    expect(await screen.findByText('Esse endereço já está em uso.')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('treats a 409 as a form error when the slug did not change', async () => {
    update.mockRejectedValue({ status: 409, message: 'x' });
    const user = setup();
    await user.type(screen.getByLabelText('Título para buscadores'), 'Algo');
    await user.click(save());
    expect(await screen.findByText('Não foi possível salvar. Tente de novo.')).toBeInTheDocument();
    expect(screen.queryByText('Esse endereço já está em uso.')).not.toBeInTheDocument();
  });

  it('unpublishes from the danger zone', async () => {
    unpublish.mockResolvedValue({});
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Despublicar' }));
    expect(unpublish).not.toHaveBeenCalled();
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText('Despublicar esta página?')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Despublicar' }));
    await waitFor(() => expect(unpublish).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();
  });
});
