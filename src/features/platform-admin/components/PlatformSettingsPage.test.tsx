import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ptMessages from '../../../../shared/i18n-messages/pt.json';

// Minimal next-intl stand-in that reads the real pt.json messages so the
// page's copy (labels, filters, badges) is exercised for real instead of
// echoing raw keys. Supports the subset PlatformSettingsPage actually uses:
// namespaced t(key, values) with {placeholder} interpolation, t.has, and
// t.rich (values may be plain interpolation — including ReactNode — or a
// RichTagsFunction for genuine <tag> children).
function resolve(namespace: string, key: string): unknown {
  const path = [...namespace.split('.'), ...key.split('.')];
  let node: unknown = ptMessages;
  for (const segment of path) {
    node = node && typeof node === 'object' ? (node as Record<string, unknown>)[segment] : undefined;
    if (node === undefined) return undefined;
  }
  return node;
}

function interpolate(template: string, values?: Record<string, unknown>): unknown {
  if (!values) return template;
  const hasNodeValue = Object.values(values).some((v) => React.isValidElement(v));
  if (!hasNodeValue) {
    return template.replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ''));
  }
  const parts = template.split(/(\{\w+\})/g);
  return parts.map((part, i) => {
    const match = part.match(/^\{(\w+)\}$/);
    if (!match) return part;
    const value = values[match[1]];
    return React.isValidElement(value) ? React.cloneElement(value, { key: i }) : String(value ?? '');
  });
}

function makeT(namespace: string) {
  const t = (key: string, values?: Record<string, unknown>) => {
    const template = resolve(namespace, key);
    return typeof template === 'string' ? (interpolate(template, values) as string) : key;
  };
  t.has = (key: string) => resolve(namespace, key) !== undefined;
  t.rich = (key: string, values?: Record<string, unknown>) => {
    const template = resolve(namespace, key);
    return typeof template === 'string' ? interpolate(template, values) : key;
  };
  t.raw = (key: string) => resolve(namespace, key);
  return t;
}

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => makeT(namespace),
  useLocale: () => 'pt',
}));

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PlatformSettingsPage } from './PlatformSettingsPage';
import {
  usePlatformSettingsQuery,
  useSetDefaultFeeRateMutation,
  useGlobalFlagsQuery,
  useSetGlobalFlagMutation,
  useFlagAuditQuery,
  useSettingsAuditQuery,
} from '../queries/get-settings';
import type { AuditLogEntry, PlatformSettingsView } from '../types/platform-admin.types';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../queries/get-settings', async () => {
  const actual = await vi.importActual<typeof import('../queries/get-settings')>('../queries/get-settings');
  return {
    ...actual,
    usePlatformSettingsQuery: vi.fn(),
    useSetDefaultFeeRateMutation: vi.fn(),
    useGlobalFlagsQuery: vi.fn(),
    useSetGlobalFlagMutation: vi.fn(),
    useFlagAuditQuery: vi.fn(),
    useSettingsAuditQuery: vi.fn(),
  };
});

const mockedSettings = vi.mocked(usePlatformSettingsQuery);
const mockedSetFee = vi.mocked(useSetDefaultFeeRateMutation);
const mockedFlags = vi.mocked(useGlobalFlagsQuery);
const mockedSetFlag = vi.mocked(useSetGlobalFlagMutation);
const mockedFlagAudit = vi.mocked(useFlagAuditQuery);
const mockedSettingsAudit = vi.mocked(useSettingsAuditQuery);

function stubQuery<T>(data: T): UseQueryResult<T> {
  return { data, isLoading: false, isError: false } as unknown as UseQueryResult<T>;
}

function stubMutation<TData = unknown, TVariables = unknown>(
  mutate = vi.fn(),
): UseMutationResult<TData, Error, TVariables> {
  return { mutate, isPending: false } as unknown as UseMutationResult<TData, Error, TVariables>;
}

const FLAGS = {
  chat: true,
  linear_channels: false,
  vod_upload: true, // beta
  two_factor: false,
  push_notifications: true, // beta
  mobile_stripe_checkout: false, // risky
  play_billing: false, // risky + beta
};

const AUDIT_ENTRIES: AuditLogEntry[] = [
  {
    id: 'a1',
    actorUserId: 'u1',
    actorName: 'Rafael M.',
    action: 'FEATURE_FLAG_SET',
    targetType: 'feature_flag',
    targetId: 'chat',
    targetLabel: null,
    metadata: { enabled: true },
    createdAt: '2026-08-08T10:00:00.000Z',
  },
  {
    id: 'a2',
    actorUserId: 'u2',
    actorName: 'Fernanda R.',
    action: 'FEE_RATE_SET',
    targetType: 'platform_settings',
    targetId: null,
    targetLabel: null,
    metadata: { rate: 0.035 },
    createdAt: '2026-08-12T14:02:00.000Z',
  },
];

function setup(overrides?: { settings?: Partial<PlatformSettingsView>; flags?: Record<string, boolean> }) {
  mockedSettings.mockReturnValue(
    stubQuery<PlatformSettingsView>({ defaultFeeRate: 0.035, cartTaxRate: 0.125, ...overrides?.settings }),
  );
  mockedSetFee.mockReturnValue(stubMutation<PlatformSettingsView, number>());
  mockedFlags.mockReturnValue(stubQuery<Record<string, boolean>>(overrides?.flags ?? FLAGS));
  mockedSetFlag.mockReturnValue(stubMutation<void, { key: string; enabled: boolean }>());
  mockedFlagAudit.mockReturnValue(
    stubQuery<AuditLogEntry[]>(AUDIT_ENTRIES.filter((e) => e.action === 'FEATURE_FLAG_SET')),
  );
  mockedSettingsAudit.mockReturnValue(stubQuery<AuditLogEntry[]>(AUDIT_ENTRIES));
}

describe('PlatformSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setup();
  });

  it('renders the default fee (editable) and the buyer fee (read-only)', () => {
    render(<PlatformSettingsPage />);

    expect(screen.getByText('3,5%')).toBeInTheDocument();
    expect(screen.getByText('12,5%')).toBeInTheDocument();
    expect(screen.getByText('CART_TAX_RATE')).toBeInTheDocument();
  });

  it('shows "—" for the buyer fee when cartTaxRate is not finite', () => {
    setup({ settings: { cartTaxRate: undefined as unknown as number } });
    render(<PlatformSettingsPage />);

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders flags grouped with counters over all flags', () => {
    render(<PlatformSettingsPage />);

    // on: chat, vod_upload, push_notifications; off: the rest; beta: vod_upload,
    // push_notifications, play_billing.
    const counters = document.querySelector('[class*="counters"]');
    expect(counters).toHaveTextContent('3 ATIVAS · 4 DESLIGADAS · 3 BETA');
    expect(screen.getByText('Chat ao vivo')).toBeInTheDocument();
    expect(screen.getByText('PLAYER & EXPERIÊNCIA')).toBeInTheDocument();
    expect(screen.getByText('PAGAMENTOS')).toBeInTheDocument();
  });

  it('search filters flags by key', async () => {
    const user = userEvent.setup();
    render(<PlatformSettingsPage />);

    await user.type(screen.getByPlaceholderText('Buscar por nome ou chave…'), 'two_factor');

    expect(screen.getByText('Autenticação em duas etapas')).toBeInTheDocument();
    expect(screen.queryByText('Chat ao vivo')).not.toBeInTheDocument();
  });

  it('the Beta filter shows only beta flags', async () => {
    const user = userEvent.setup();
    render(<PlatformSettingsPage />);

    await user.click(screen.getByRole('button', { name: 'Beta' }));

    expect(screen.getByText('Upload de VOD')).toBeInTheDocument();
    expect(screen.getByText('Notificações push')).toBeInTheDocument();
    expect(screen.queryByText('Chat ao vivo')).not.toBeInTheDocument();
    expect(screen.queryByText('Autenticação em duas etapas')).not.toBeInTheDocument();
  });

  it('toggling a non-risky flag calls the mutation immediately', async () => {
    const mutate = vi.fn();
    mockedSetFlag.mockReturnValue(stubMutation<void, { key: string; enabled: boolean }>(mutate));
    const user = userEvent.setup();
    render(<PlatformSettingsPage />);

    const chatRow = screen.getByText('Chat ao vivo').closest('div')!.parentElement!.parentElement!;
    await user.click(within(chatRow).getByRole('button', { name: /Chat ao vivo/ }));

    expect(mutate).toHaveBeenCalledWith({ key: 'chat', enabled: false }, expect.anything());
    expect(screen.queryByText('Confirmar alteração.')).not.toBeInTheDocument();
  });

  it('toggling a risky flag shows the confirm panel and only mutates after confirming', async () => {
    const mutate = vi.fn();
    mockedSetFlag.mockReturnValue(stubMutation<void, { key: string; enabled: boolean }>(mutate));
    const user = userEvent.setup();
    render(<PlatformSettingsPage />);

    const row = screen.getByText('Checkout Stripe no app').closest('div')!.parentElement!.parentElement!;
    await user.click(within(row).getByRole('button', { name: /Checkout Stripe no app/ }));

    expect(screen.getByText('Confirmar alteração.')).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Ativar mesmo assim' }));

    expect(mutate).toHaveBeenCalledWith({ key: 'mobile_stripe_checkout', enabled: true }, expect.anything());
  });

  it('cancel clears the pending confirm state without mutating', async () => {
    const mutate = vi.fn();
    mockedSetFlag.mockReturnValue(stubMutation<void, { key: string; enabled: boolean }>(mutate));
    const user = userEvent.setup();
    render(<PlatformSettingsPage />);

    const row = screen.getByText('Checkout Stripe no app').closest('div')!.parentElement!.parentElement!;
    await user.click(within(row).getByRole('button', { name: /Checkout Stripe no app/ }));
    expect(screen.getByText('Confirmar alteração.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByText('Confirmar alteração.')).not.toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('shows up to 6 audit entries mapped to readable action text', () => {
    render(<PlatformSettingsPage />);

    expect(screen.getByText((_, el) => el?.textContent === 'chat ativada')).toBeInTheDocument();
    expect(screen.getByText(/alterada para 3,5%/)).toBeInTheDocument();
    // Exact date rendering (month style, hour) is Intl/timezone-dependent in the
    // test runner; only assert the actor name made it into the sub line.
    expect(screen.getByText((text) => text.startsWith('Rafael M. ·'))).toBeInTheDocument();
  });

  it('shows the empty state with the search query when nothing matches', async () => {
    const user = userEvent.setup();
    render(<PlatformSettingsPage />);

    await user.type(screen.getByPlaceholderText('Buscar por nome ou chave…'), 'nada-disso-existe');

    expect(screen.getByText('Nenhuma flag corresponde a "nada-disso-existe".')).toBeInTheDocument();
  });
});
