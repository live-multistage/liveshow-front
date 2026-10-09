import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('../../components/SettingsAuditRail', () => ({ SettingsAuditRail: () => null }));

const store = vi.hoisted(() => ({
  templates: [] as unknown[],
  overrides: [] as unknown[],
  global: null as unknown,
  setTemplate: vi.fn(),
  createOverride: vi.fn(),
  updateOverride: vi.fn(),
  deleteOverride: vi.fn(),
  setGlobal: vi.fn(),
  upload: vi.fn(),
}));
vi.mock('../queries/use-seo-admin', () => {
  const query = (data: unknown) => ({ data, isLoading: false, isError: false, refetch: vi.fn() });
  const mutation = (fn: unknown) => ({ mutateAsync: fn, isPending: false });
  return {
    useSeoTemplatesQuery: () => query(store.templates),
    useSeoOverridesQuery: () => query(store.overrides),
    useSeoGlobalQuery: () => query(store.global),
    useSetSeoTemplateMutation: () => mutation(store.setTemplate),
    useCreateSeoOverrideMutation: () => mutation(store.createOverride),
    useUpdateSeoOverrideMutation: () => mutation(store.updateOverride),
    useDeleteSeoOverrideMutation: () => mutation(store.deleteOverride),
    useSetSeoGlobalMutation: () => mutation(store.setGlobal),
    useUploadOgImageMutation: () => mutation(store.upload),
  };
});

import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JSONLD_STARTERS, SEO_PAGE_KEYS } from '@live-show/api-contracts';
import { SeoAdminPage } from './SeoAdminPage';

const EMPTY = {
  titleTemplate: null,
  descriptionTemplate: null,
  ogImageUrl: null,
  keywords: null, ogTitle: null, ogDescription: null, twitterTitle: null, twitterDescription: null, canonicalUrl: null, locale: null, jsonLdMode: null,
  robotsIndex: null,
  robotsFollow: null,
  disabledGeneratedJsonLd: [],
  extraJsonLd: [],
  updatedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  store.templates = SEO_PAGE_KEYS.map((pageKey) => ({ ...EMPTY, pageKey }));
  store.overrides = [];
  store.setTemplate.mockResolvedValue({});
  store.createOverride.mockResolvedValue({});
});

const saveButton = () => screen.getByRole('button', { name: 'Salvar' });
const block1 = () => screen.getByRole('textbox', { name: 'JSON-LD do bloco 1' });
const savedFields = () => store.setTemplate.mock.calls[0][0].fields;

async function openEventEditor() {
  const user = userEvent.setup();
  render(<SeoAdminPage />);
  await user.click(screen.getByRole('button', { name: /Evento/ }));
  return user;
}

const SCRIPT = '<script type="application/ld+json">{"@context":"https://schema.org","@type":"Thing","name":"x"}</script>';

describe('JSON-LD blocks', () => {
  it('normalizes a pasted <script> block to stripped, pretty JSON and reports it valid', async () => {
    const user = await openEventEditor();
    await user.click(screen.getByRole('button', { name: 'Adicionar bloco' }));
    await user.click(block1());
    await user.paste(SCRIPT);
    expect(block1()).toHaveValue(JSON.stringify(JSON.parse(SCRIPT.replace(/<\/?script[^>]*>/g, '')), null, 2));
    expect(screen.getByText('JSON válido · 1 tipo: Thing')).toBeInTheDocument();
  });

  it('inserts the starter for the page type', async () => {
    const user = await openEventEditor();
    await user.click(screen.getByRole('button', { name: 'Inserir modelo' }));
    expect(block1()).toHaveValue(JSONLD_STARTERS['events.detail']);
  });

  it('marks a generated type as replaced when a block declares it (also inside @graph)', async () => {
    const user = await openEventEditor();
    await user.click(screen.getByRole('button', { name: 'Adicionar bloco' }));
    fireEvent.change(block1(), {
      target: { value: '{"@context":"https://schema.org","@graph":[{"@type":"BreadcrumbList"}]}' },
    });
    expect(screen.getAllByText('substituído pelo seu bloco')).toHaveLength(1);
    expect(screen.getByRole('switch', { name: 'BreadcrumbList' })).not.toBeChecked();
  });

  it('dims the generated list in Replace mode', async () => {
    const user = await openEventEditor();
    await user.click(screen.getByRole('radio', { name: 'Substituir' }));
    expect(screen.getByText('ignorados no modo Substituir')).toBeInTheDocument();
    expect(screen.getByText(/Só os seus blocos serão publicados/)).toBeInTheDocument();
  });
});

describe('OG image', () => {
  const file = () => new File(['x'], 'cover.png', { type: 'image/png' });
  const uploaded = { key: 'seo/og/abc.jpg', url: 'https://cdn.showon.io/seo/og/abc.jpg', width: 1200, height: 630 };

  it('previews the returned URL after an upload and saves the key', async () => {
    store.upload.mockResolvedValue(uploaded);
    const user = await openEventEditor();
    await user.upload(screen.getByLabelText('Arquivo da imagem'), file());
    expect(await screen.findByAltText('Miniatura da imagem OG')).toHaveAttribute('src', uploaded.url);
    await user.click(saveButton());
    expect(savedFields().ogImageUrl).toBe(uploaded.key);
  });

  it('removing the image sends null', async () => {
    store.templates = store.templates.map((t) =>
      (t as { pageKey: string }).pageKey === 'events.detail' ? { ...(t as object), ogImageUrl: 'https://cdn.showon.io/x.jpg' } : t,
    );
    const user = await openEventEditor();
    await user.click(screen.getByRole('button', { name: 'Remover' }));
    await user.click(saveButton());
    expect(savedFields().ogImageUrl).toBeNull();
  });

  it('keeps an already stored image untouched when saving other fields', async () => {
    store.templates = store.templates.map((t) =>
      (t as { pageKey: string }).pageKey === 'events.detail' ? { ...(t as object), ogImageUrl: 'https://cdn.showon.io/x.jpg' } : t,
    );
    const user = await openEventEditor();
    await user.type(screen.getByRole('textbox', { name: 'Título' }), 'Oi');
    await user.click(saveButton());
    expect(savedFields().ogImageUrl).toBe('https://cdn.showon.io/x.jpg');
  });

  it('does not lock Save on a stored http image and still shows its thumbnail', async () => {
    const stored = 'http://localhost:3001/uploads/seo/og/a.jpg';
    store.templates = store.templates.map((t) =>
      (t as { pageKey: string }).pageKey === 'events.detail' ? { ...(t as object), ogImageUrl: stored } : t,
    );
    const user = await openEventEditor();
    expect(screen.getByAltText('Miniatura da imagem OG')).toHaveAttribute('src', stored);
    await user.type(screen.getByRole('textbox', { name: 'Título' }), 'Oi');
    expect(saveButton()).toBeEnabled();
    await user.click(saveButton());
    expect(savedFields().ogImageUrl).toBe(stored);
  });

  it('rejects a wrong type before uploading', async () => {
    await openEventEditor();
    fireEvent.change(screen.getByLabelText('Arquivo da imagem'), {
      target: { files: [new File(['x'], 'a.svg', { type: 'image/svg+xml' })] },
    });
    expect(await screen.findByText('Use JPEG, PNG, GIF ou WebP')).toBeInTheDocument();
    expect(store.upload).not.toHaveBeenCalled();
  });
});

describe('JSON-LD mode, counters and inheritance', () => {
  it('an override on "Herdar do template" sends jsonLdMode null', async () => {
    const user = userEvent.setup();
    render(<SeoAdminPage />);
    await user.click(screen.getByRole('tab', { name: /Por URL/ }));
    await user.click(screen.getAllByRole('button', { name: /Novo override/ })[0]);
    await user.type(screen.getByRole('textbox', { name: 'Caminho' }), '/events/x');
    await user.type(screen.getByRole('textbox', { name: 'Título' }), 'T');
    await user.click(screen.getByRole('radio', { name: 'Substituir' }));
    await user.click(screen.getByRole('radio', { name: 'Herdar do template' }));
    await user.click(saveButton());
    expect(store.createOverride.mock.calls[0][0].jsonLdMode).toBeNull();
  });

  it('shows Otimizado at 55 characters and Longo at 70', async () => {
    await openEventEditor();
    const title = screen.getByRole('textbox', { name: 'Título' });
    fireEvent.change(title, { target: { value: 'a'.repeat(55) } });
    expect(screen.getByText('Otimizado')).toBeInTheDocument();
    fireEvent.change(title, { target: { value: 'a'.repeat(70) } });
    expect(screen.getByText('Longo')).toBeInTheDocument();
  });

  it('shows the meta title as the OG title placeholder', async () => {
    await openEventEditor();
    fireEvent.change(screen.getByRole('textbox', { name: 'Título' }), { target: { value: 'Meu título' } });
    expect(screen.getByRole('textbox', { name: 'Título OG' })).toHaveAttribute('placeholder', 'Meu título');
  });

  it('shows the server error for a foreign canonical domain', async () => {
    store.setTemplate.mockRejectedValue({
      status: 400,
      message: 'Invalid SEO configuration',
      details: [{ field: 'canonicalUrl', message: 'A URL canônica precisa ser de showon.io' }],
    });
    const user = await openEventEditor();
    await user.type(screen.getByRole('textbox', { name: 'Canonical URL' }), 'https://evil.com/x');
    await user.click(saveButton());
    expect(await screen.findByText('A URL canônica precisa ser de showon.io')).toBeInTheDocument();
  });

  it('restore default also clears the advanced fields', async () => {
    store.templates = store.templates.map((t) =>
      (t as { pageKey: string }).pageKey === 'events.detail' ? { ...(t as object), ogTitle: 'OG', canonicalUrl: 'https://showon.io/a', updatedAt: '2026-09-28T10:00:00Z' } : t,
    );
    const user = await openEventEditor();
    await user.click(screen.getByRole('button', { name: 'Restaurar padrão' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Restaurar padrão?' })).getByRole('button', { name: 'Restaurar padrão' }));
    expect(screen.getByRole('textbox', { name: 'Título OG' })).toHaveValue('');
    expect(screen.getByRole('textbox', { name: 'Canonical URL' })).toHaveValue('');
  });
});

describe('OG image URL tab', () => {
  it('can be typed into character by character and only previews a valid https URL', async () => {
    const user = await openEventEditor();
    await user.click(screen.getByRole('tab', { name: 'URL' }));
    const input = screen.getByRole('textbox', { name: 'URL da imagem' });
    await user.type(input, 'https://cdn.showon.io/a.jpg');
    expect(input).toHaveValue('https://cdn.showon.io/a.jpg');
    expect(screen.getByAltText('Miniatura da imagem OG')).toHaveAttribute('src', 'https://cdn.showon.io/a.jpg');
    await user.clear(input);
    await user.type(input, 'htt');
    expect(input).toHaveValue('htt');
    expect(screen.getByText('Use uma URL https://.')).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it('works the same on the Global tab and saves the typed URL', async () => {
    store.global = {
      googleSiteVerification: null, bingSiteVerification: null, defaultOgImageUrl: null,
      organizationJsonLd: null, websiteJsonLd: null, robotsExtraRules: [],
    };
    store.setGlobal.mockImplementation(async (g: unknown) => g);
    const user = userEvent.setup();
    render(<SeoAdminPage />);
    await user.click(screen.getByRole('tab', { name: 'Global' }));
    await user.click(screen.getByRole('tab', { name: 'URL' }));
    await user.type(screen.getByRole('textbox', { name: 'URL da imagem' }), 'https://cdn.showon.io/g.jpg');
    await user.click(saveButton());
    expect(store.setGlobal.mock.calls[0][0].defaultOgImageUrl).toBe('https://cdn.showon.io/g.jpg');
  });

  it('Global: after uploading and saving the form is clean and still shows the image', async () => {
    store.global = {
      googleSiteVerification: null, bingSiteVerification: null, defaultOgImageUrl: null,
      organizationJsonLd: null, websiteJsonLd: null, robotsExtraRules: [],
    };
    const url = 'https://cdn.showon.io/seo/og/g.jpg';
    store.upload.mockResolvedValue({ key: 'seo/og/g.jpg', url, width: 1200, height: 630 });
    store.setGlobal.mockImplementation(async (g: object) => ({ ...g, defaultOgImageUrl: url }));
    const user = userEvent.setup();
    render(<SeoAdminPage />);
    await user.click(screen.getByRole('tab', { name: 'Global' }));
    await user.upload(screen.getByLabelText('Arquivo da imagem'), new File(['x'], 'g.png', { type: 'image/png' }));
    await user.click(saveButton());
    expect(store.setGlobal.mock.calls[0][0].defaultOgImageUrl).toBe('seo/og/g.jpg');
    expect(await screen.findByAltText('Miniatura da imagem OG')).toHaveAttribute('src', url);
    expect(saveButton()).toBeDisabled();
  });
});

describe('template mode after restore', () => {
  it('falls back to COMPLEMENT in both the mode control and the generated list', async () => {
    store.templates = store.templates.map((t) =>
      (t as { pageKey: string }).pageKey === 'events.detail' ? { ...(t as object), jsonLdMode: 'REPLACE', updatedAt: '2026-09-28T10:00:00Z' } : t,
    );
    const user = await openEventEditor();
    expect(screen.getByText('ignorados no modo Substituir')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Restaurar padrão' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Restaurar padrão?' })).getByRole('button', { name: 'Restaurar padrão' }));
    expect(screen.getByRole('radio', { name: 'Complementar' })).toBeChecked();
    expect(screen.queryByText('ignorados no modo Substituir')).not.toBeInTheDocument();
  });
});
