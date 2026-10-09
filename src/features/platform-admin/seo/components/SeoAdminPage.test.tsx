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
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
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
  };
});

import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SEO_PAGE_KEYS } from '@live-show/api-contracts';
import { SeoAdminPage } from './SeoAdminPage';

const EMPTY = {
  titleTemplate: null,
  descriptionTemplate: null,
  ogImageUrl: null,
  robotsIndex: null,
  robotsFollow: null,
  disabledGeneratedJsonLd: [],
  extraJsonLd: [],
  updatedAt: null,
};
const FIELD_KEYS = [
  'descriptionTemplate', 'disabledGeneratedJsonLd', 'extraJsonLd', 'ogImageUrl',
  'robotsFollow', 'robotsIndex', 'titleTemplate',
];

beforeEach(() => {
  vi.clearAllMocks();
  store.templates = SEO_PAGE_KEYS.map((pageKey) =>
    pageKey === 'events.detail'
      ? { ...EMPTY, pageKey, titleTemplate: '{{event.name}} ao vivo', updatedAt: '2026-09-28T10:00:00Z' }
      : { ...EMPTY, pageKey },
  );
  store.overrides = [];
  store.global = {
    googleSiteVerification: null,
    bingSiteVerification: null,
    defaultOgImageUrl: null,
    organizationJsonLd: null,
    websiteJsonLd: null,
    robotsExtraRules: [],
  };
  store.setTemplate.mockResolvedValue({});
  store.createOverride.mockResolvedValue({});
  store.setGlobal.mockImplementation(async (g: unknown) => g);
});

const saveButton = () => screen.getByRole('button', { name: 'Salvar' });

async function openEventEditor() {
  const user = userEvent.setup();
  render(<SeoAdminPage />);
  await user.click(screen.getByRole('button', { name: /Evento/ }));
  return user;
}

describe('SEO page templates', () => {
  it('lists the 16 page types and marks customized ones', () => {
    render(<SeoAdminPage />);
    expect(screen.getAllByText('PERSONALIZADO')).toHaveLength(1);
    expect(screen.getAllByText('PADRÃO')).toHaveLength(15);
  });

  it('flags an unknown placeholder in a JSON-LD block and disables Save', async () => {
    const user = await openEventEditor();
    await user.click(screen.getByRole('button', { name: 'Adicionar bloco' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'JSON-LD do bloco 1' }), {
      target: { value: '{"@context":"https://schema.org","@type":"Thing","name":"{{nope}}"}' },
    });
    expect(screen.getByText('Variável desconhecida: nope')).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it('shows a server 400 field error under the matching block', async () => {
    store.setTemplate.mockRejectedValue({
      status: 400,
      message: 'Invalid SEO configuration',
      details: [{ field: 'extraJsonLd[0]', message: 'Variável desconhecida {{channel.name}}' }],
    });
    const user = await openEventEditor();
    await user.click(screen.getByRole('button', { name: 'Adicionar bloco' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'JSON-LD do bloco 1' }), {
      target: { value: '{"@context":"https://schema.org","@type":"Thing"}' },
    });
    await user.click(saveButton());
    const alert = await screen.findByText('Variável desconhecida {{channel.name}}');
    expect(alert).toBeInTheDocument();
    expect(alert.closest('[data-block]')).toHaveAttribute('data-block', '1');
  });

  it('saves exactly the SeoFields keys and sends null for a cleared field', async () => {
    const user = await openEventEditor();
    await user.clear(screen.getByRole('textbox', { name: 'Título' }));
    await user.click(saveButton());
    expect(store.setTemplate).toHaveBeenCalledTimes(1);
    const { pageKey, fields } = store.setTemplate.mock.calls[0][0];
    expect(pageKey).toBe('events.detail');
    expect(Object.keys(fields).sort()).toEqual(FIELD_KEYS);
    expect(fields.titleTemplate).toBeNull();
    expect(fields.extraJsonLd).toEqual([]);
  });

  it('restore default only clears the form; nothing is sent until Save', async () => {
    const user = await openEventEditor();
    await user.click(screen.getByRole('button', { name: 'Restaurar padrão' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Restaurar padrão?' })).getByRole('button', { name: 'Restaurar padrão' }));
    expect(screen.getByRole('textbox', { name: 'Título' })).toHaveValue('');
    expect(store.setTemplate).not.toHaveBeenCalled();
    await user.click(saveButton());
    expect(store.setTemplate.mock.calls[0][0].fields).toEqual({
      titleTemplate: null, descriptionTemplate: null, ogImageUrl: null, robotsIndex: null,
      robotsFollow: null, disabledGeneratedJsonLd: [], extraJsonLd: [],
    });
  });
});

describe('SEO URL overrides', () => {
  async function openNewOverride() {
    const user = userEvent.setup();
    render(<SeoAdminPage />);
    await user.click(screen.getByRole('tab', { name: /Por URL/ }));
    await user.click(screen.getAllByRole('button', { name: /Novo override/ })[0]);
    return user;
  }

  it('rejects a non-indexable path and keeps Save disabled', async () => {
    const user = await openNewOverride();
    await user.type(screen.getByRole('textbox', { name: 'Caminho' }), '/dashboard');
    expect(screen.getByText('Não é uma página indexável')).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it('detects the page type and shows the normalized path', async () => {
    const user = await openNewOverride();
    await user.type(screen.getByRole('textbox', { name: 'Caminho' }), '/Events/X/');
    expect(screen.getByText('Evento (/events/:slug)')).toBeInTheDocument();
    expect(screen.getByText('/events/x')).toBeInTheDocument();
  });

  it('creates with the normalized path and surfaces a 409 conflict', async () => {
    const existing = { ...EMPTY, id: 'o1', path: '/events/x', pageKey: 'events.detail', updatedAt: '2026-09-28T10:00:00Z' };
    store.overrides = [existing];
    store.createOverride.mockRejectedValue({ status: 409, message: 'conflict' });
    const user = await openNewOverride();
    await user.type(screen.getByRole('textbox', { name: 'Caminho' }), '/Events/X/');
    await user.type(screen.getByRole('textbox', { name: 'Título' }), 'Titulo');
    await user.click(saveButton());
    expect(store.createOverride.mock.calls[0][0].path).toBe('/events/x');
    expect(await screen.findByText('Já existe um override para este caminho.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Abrir existente' }));
    expect(screen.getByRole('textbox', { name: 'Caminho' })).toHaveValue('/events/x');
  });
});

describe('SEO global', () => {
  async function openGlobal() {
    const user = userEvent.setup();
    render(<SeoAdminPage />);
    await user.click(screen.getByRole('tab', { name: 'Global' }));
    return user;
  }

  it('shows the fixed disallow list as read-only text', async () => {
    await openGlobal();
    const fixed = screen.getByRole('group', { name: /Regras fixas/ });
    expect(within(fixed).getByText('/api/')).toBeInTheDocument();
    expect(within(fixed).queryByRole('textbox')).not.toBeInTheDocument();
    expect(within(fixed).queryByRole('button')).not.toBeInTheDocument();
  });

  it('rejects a stored robots user-agent containing a newline and blocks Save', async () => {
    // Inputs strip newlines on their own, so the guard matters for values that arrive pre-filled.
    store.global = { ...(store.global as object), robotsExtraRules: [{ userAgent: 'Bot\nDisallow: /', allow: [], disallow: [] }] };
    const user = await openGlobal();
    expect(screen.getByText(/Informe o user-agent, em uma linha só/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Google Search Console'), 'abc');
    await user.click(saveButton());
    expect(store.setGlobal).not.toHaveBeenCalled();
  });

  it('shows the empty user-agent error once the rule has a path, and commits a path on blur', async () => {
    const user = await openGlobal();
    await user.click(screen.getByRole('button', { name: 'Adicionar regra' }));
    expect(screen.queryByText(/Informe o user-agent/)).not.toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Disallow' }), '/x');
    await user.tab();
    expect(screen.getByText('/x')).toBeInTheDocument();
    expect(screen.getByText(/Informe o user-agent/)).toBeInTheDocument();
  });

  it('rejects a path without a leading slash and accepts one with it', async () => {
    const user = await openGlobal();
    await user.click(screen.getByRole('button', { name: 'Adicionar regra' }));
    await user.type(screen.getByRole('combobox', { name: 'User-agent' }), 'GPTBot');
    await user.type(screen.getByRole('textbox', { name: 'Disallow' }), 'private{Enter}');
    expect(screen.getByText(/O caminho precisa começar com \//)).toBeInTheDocument();
    await user.clear(screen.getByRole('textbox', { name: 'Disallow' }));
    await user.type(screen.getByRole('textbox', { name: 'Disallow' }), '/private{Enter}');
    expect(screen.queryByText(/O caminho precisa começar com \//)).not.toBeInTheDocument();
    await user.click(saveButton());
    expect(store.setGlobal.mock.calls[0][0].robotsExtraRules).toEqual([
      { userAgent: 'GPTBot', allow: [], disallow: ['/private'] },
    ]);
  });
});
