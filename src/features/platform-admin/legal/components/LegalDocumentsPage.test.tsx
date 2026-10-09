import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const store = vi.hoisted(() => ({
  docs: {} as Record<string, unknown>,
  versions: {} as Record<string, unknown[]>,
  publish: vi.fn(),
  listeners: new Set<() => void>(),
}));
vi.mock('../queries/use-legal-admin', () => ({
  useLegalCurrentQuery: (kind: string) => {
    const [, setTick] = React.useState(0);
    React.useEffect(() => {
      const listener = () => setTick((n) => n + 1);
      store.listeners.add(listener);
      return () => void store.listeners.delete(listener);
    }, []);
    // Like react-query: refetch resolves with the fresh data and re-renders every subscriber.
    const refetch = async () => {
      store.listeners.forEach((l) => l());
      return { data: store.docs[kind] };
    };
    return { data: store.docs[kind], isLoading: false, isError: false, refetch };
  },
  useLegalVersionsQuery: (kind: string) => ({ data: store.versions[kind], isLoading: false, isError: false, refetch: vi.fn() }),
  usePublishLegalVersionMutation: () => ({ mutateAsync: store.publish, isPending: false }),
}));

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { LegalDocumentsPage } from './LegalDocumentsPage';

const PRIVACY_V3 = '## Quem somos\n\nTexto atual.';
const summary = (version: number, changeSummary: string) => ({ version, publishedAt: '2026-07-28T16:12:00Z', changeSummary });

function seed() {
  store.docs = {
    terms: { ...summary(5, 'Regras de reembolso'), document: 'terms', content: { pt: 'Termos pt' } },
    privacy: { ...summary(3, 'Dados de uso'), document: 'privacy', content: { pt: PRIVACY_V3, en: 'English text' } },
  };
  store.versions = {
    terms: [summary(5, 'Regras de reembolso')],
    privacy: [summary(3, 'Dados de uso'), summary(2, 'Inclui inglês'), summary(1, 'Primeira versão.')],
  };
}

async function openPrivacyEditor() {
  const user = userEvent.setup();
  render(<LegalDocumentsPage />);
  const card = screen.getByRole('region', { name: 'Política de Privacidade' });
  await user.click(within(card).getByRole('button', { name: /Editar/ }));
  return user;
}

const publishButton = () => screen.getByRole('button', { name: /Publicar versão/ });
const markdownBox = () => screen.getByRole('textbox', { name: /MARKDOWN/ });

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  seed();
});

describe('LegalDocumentsPage list', () => {
  it('shows both documents with their current version', () => {
    render(<LegalDocumentsPage />);
    expect(screen.getByText('VERSÃO 5')).toBeInTheDocument();
    expect(screen.getByText('VERSÃO 3')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Ver página pública/ })[1]).toHaveAttribute('href', '/privacidade');
  });
});

describe('LegalDocumentsPage editor', () => {
  it('keeps Publish disabled until PT is filled, the summary is filled and the text changed', async () => {
    const user = await openPrivacyEditor();
    expect(screen.getByText(/Editando a partir da versão 3/)).toBeInTheDocument();
    expect(publishButton()).toBeDisabled(); // nothing changed

    await user.type(markdownBox(), ' Mais.');
    expect(publishButton()).toBeDisabled(); // no summary

    await user.type(screen.getByLabelText(/Resumo da mudança/), 'Ajuste');
    expect(publishButton()).toBeEnabled();

    await user.clear(markdownBox());
    expect(publishButton()).toBeDisabled(); // PT empty
  });

  it('marks a locale tab with a dot when it differs from the current version', async () => {
    const user = await openPrivacyEditor();
    expect(screen.queryByRole('img', { name: 'Difere da versão vigente' })).not.toBeInTheDocument();
    await user.type(markdownBox(), 'x');
    expect(screen.getByRole('img', { name: 'Difere da versão vigente' })).toBeInTheDocument();
  });

  it('renders the preview with the public markdown component', async () => {
    await openPrivacyEditor();
    expect(screen.getByRole('heading', { level: 2, name: 'Quem somos' })).toBeInTheDocument();
  });

  it('confirms with the next version number, publishes, then lists the new version', async () => {
    store.publish.mockImplementation(async (body: { content: { pt: string; en?: string }; changeSummary: string }) => {
      const published = { ...summary(4, body.changeSummary), document: 'privacy', content: body.content };
      store.docs.privacy = published;
      store.versions.privacy = [summary(4, body.changeSummary), ...store.versions.privacy];
      return published;
    });
    const user = await openPrivacyEditor();
    await user.type(markdownBox(), ' Mais.');
    await user.type(screen.getByLabelText(/Resumo da mudança/), 'Inclui operador');
    await user.click(publishButton());

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Publicar versão 4 de Política de Privacidade?')).toBeInTheDocument();
    expect(within(dialog).getByText('Inclui operador')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Publicar versão 4' }));

    expect(store.publish).toHaveBeenCalledWith({
      content: { pt: `${PRIVACY_V3} Mais.`, en: 'English text' },
      changeSummary: 'Inclui operador',
    });
    expect(toast.success).toHaveBeenCalledWith('Versão 4 de Política de Privacidade publicada.');

    // back on the list with the new current version; history lists it as current
    expect(await screen.findByText('VERSÃO 4')).toBeInTheDocument();
    const card = screen.getByRole('region', { name: 'Política de Privacidade' });
    await user.click(within(card).getByRole('button', { name: /Histórico/ }));
    const drawer = await screen.findByRole('dialog');
    expect(within(drawer).getByText('VERSÃO 4')).toBeInTheDocument();
    expect(within(drawer).getByText('VIGENTE')).toBeInTheDocument();

    // reopening the editor starts from the new current text
    await user.keyboard('{Escape}');
    await user.click(within(card).getByRole('button', { name: /Editar/ }));
    expect(screen.getByText(/Editando a partir da versão 4/)).toBeInTheDocument();
    expect(markdownBox()).toHaveValue(`${PRIVACY_V3} Mais.`);
  });

  it('shows the reload banner on 409', async () => {
    store.publish.mockRejectedValue({ status: 409, message: 'conflict' });
    const user = await openPrivacyEditor();
    await user.type(markdownBox(), 'x');
    await user.type(screen.getByLabelText(/Resumo da mudança/), 'S');
    await user.click(publishButton());
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Publicar versão 4' }));

    expect(await screen.findByText(/Outra versão foi publicada enquanto você editava/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recarregar' })).toBeInTheDocument();
    // a retry would overwrite the other admin's version: blocked until reload
    expect(publishButton()).toBeDisabled();
  });

  it('Recarregar discards the draft and shows the version published by the other admin', async () => {
    store.publish.mockRejectedValue({ status: 409, message: 'conflict' });
    const user = await openPrivacyEditor();
    await user.type(markdownBox(), 'minha edição');
    await user.type(screen.getByLabelText(/Resumo da mudança/), 'S');
    await user.click(publishButton());
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Publicar versão 4' }));
    await screen.findByText(/Outra versão foi publicada/);

    const V4 = '## Quem somos\n\nTexto da versão 4.';
    store.docs.privacy = { ...summary(4, 'Outro admin'), document: 'privacy', content: { pt: V4 } };
    await user.click(screen.getByRole('button', { name: 'Recarregar' }));

    expect(await screen.findByText(/Editando a partir da versão 4/)).toBeInTheDocument();
    expect(markdownBox()).toHaveValue(V4);
    expect(screen.queryByText(/Outra versão foi publicada/)).not.toBeInTheDocument();
    expect(screen.queryByText('Rascunho restaurado.')).not.toBeInTheDocument();
  });

  it('shows the server message on 400', async () => {
    store.publish.mockRejectedValue({ status: 400, message: 'Link não permitido' });
    const user = await openPrivacyEditor();
    await user.type(markdownBox(), 'x');
    await user.type(screen.getByLabelText(/Resumo da mudança/), 'S');
    await user.click(publishButton());
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Publicar versão 4' }));

    expect(await screen.findByText('Link não permitido')).toBeInTheDocument();
  });

  it('restores a local draft and lets the admin discard it', async () => {
    localStorage.setItem('showon-legal-draft-privacy', JSON.stringify({ pt: 'rascunho', en: '', es: '' }));
    const user = await openPrivacyEditor();
    expect(screen.getByText('Rascunho restaurado.')).toBeInTheDocument();
    expect(markdownBox()).toHaveValue('rascunho');
    await user.click(screen.getByRole('button', { name: 'Descartar rascunho' }));
    expect(markdownBox()).toHaveValue(PRIVACY_V3);
  });
});
