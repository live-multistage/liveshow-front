import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ptMessages from '../../../../shared/i18n-messages/pt.json';

// Same minimal next-intl stand-in used by PlatformSettingsPage.test.tsx —
// reads real pt.json copy instead of echoing raw keys.
function resolve(namespace: string, key: string): unknown {
  const path = [...namespace.split('.'), ...key.split('.')];
  let node: unknown = ptMessages;
  for (const segment of path) {
    node = node && typeof node === 'object' ? (node as Record<string, unknown>)[segment] : undefined;
    if (node === undefined) return undefined;
  }
  return node;
}

function makeT(namespace: string) {
  const t = (key: string) => {
    const template = resolve(namespace, key);
    return typeof template === 'string' ? template : key;
  };
  t.has = (key: string) => resolve(namespace, key) !== undefined;
  return t;
}

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => makeT(namespace),
  useLocale: () => 'pt',
}));

import { render, screen, within, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BlueprintHttpSection } from './BlueprintHttpSection';
import { usePlatformSettingsQuery, useSetBlueprintHttpAllowlistMutation } from '../queries/get-settings';
import { useBlueprintSecretsQuery } from '../blueprints/queries/blueprint-secrets.queries';
import { useSetBlueprintSecretMutation, useDeleteBlueprintSecretMutation } from '../blueprints/mutations/blueprint-secrets.mutations';
import type { PlatformSettingsView } from '../types/platform-admin.types';
import type { BlueprintSecretSummary } from '@live-show/api-contracts';
import type { AppError } from '@/lib/http/errors';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../queries/get-settings', async () => {
  const actual = await vi.importActual<typeof import('../queries/get-settings')>('../queries/get-settings');
  return { ...actual, usePlatformSettingsQuery: vi.fn(), useSetBlueprintHttpAllowlistMutation: vi.fn() };
});
vi.mock('../blueprints/queries/blueprint-secrets.queries', () => ({ useBlueprintSecretsQuery: vi.fn() }));
vi.mock('../blueprints/mutations/blueprint-secrets.mutations', () => ({
  useSetBlueprintSecretMutation: vi.fn(),
  useDeleteBlueprintSecretMutation: vi.fn(),
}));

const mockedSettings = vi.mocked(usePlatformSettingsQuery);
const mockedSetAllowlist = vi.mocked(useSetBlueprintHttpAllowlistMutation);
const mockedSecrets = vi.mocked(useBlueprintSecretsQuery);
const mockedSetSecret = vi.mocked(useSetBlueprintSecretMutation);
const mockedDeleteSecret = vi.mocked(useDeleteBlueprintSecretMutation);

function stubQuery<T>(data: T, extra?: Partial<UseQueryResult<T>>): UseQueryResult<T> {
  return { data, isLoading: false, isError: false, ...extra } as unknown as UseQueryResult<T>;
}

function stubMutation<TData = unknown, TVariables = unknown, TError = AppError>(
  mutate: (...args: unknown[]) => unknown = vi.fn(),
  extra?: Partial<UseMutationResult<TData, TError, TVariables>>,
): UseMutationResult<TData, TError, TVariables> {
  return { mutate, isPending: false, ...extra } as unknown as UseMutationResult<TData, TError, TVariables>;
}

const SECRETS: BlueprintSecretSummary[] = [
  { name: 'PARTNER', updatedAt: '2026-09-12T14:20:00.000Z' },
  { name: 'STRIPE_WH', updatedAt: '2026-09-01T09:03:00.000Z' },
];

function setup(overrides?: {
  settings?: Partial<PlatformSettingsView>;
  secrets?: BlueprintSecretSummary[];
  secretsQuery?: Partial<UseQueryResult<BlueprintSecretSummary[]>>;
  setAllowlistMutate?: (...args: unknown[]) => unknown;
  setSecretMutate?: (...args: unknown[]) => unknown;
  deleteSecretMutate?: (...args: unknown[]) => unknown;
}) {
  mockedSettings.mockReturnValue(
    stubQuery<PlatformSettingsView>({
      defaultFeeRate: 0.035,
      cartTaxRate: 0.125,
      blueprintHttpAllowlist: ['api.partner.com', '*.stripe.com'],
      ...overrides?.settings,
    }),
  );
  mockedSetAllowlist.mockReturnValue(stubMutation<PlatformSettingsView, string[], Error>(overrides?.setAllowlistMutate));
  mockedSecrets.mockReturnValue(stubQuery<BlueprintSecretSummary[]>(overrides?.secrets ?? SECRETS, overrides?.secretsQuery));
  mockedSetSecret.mockReturnValue(stubMutation<void, { name: string; value: string }>(overrides?.setSecretMutate));
  mockedDeleteSecret.mockReturnValue(stubMutation<void, { name: string }>(overrides?.deleteSecretMutate));
}

describe('BlueprintHttpSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setup();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the allowlist chips and the secrets table', () => {
    render(<BlueprintHttpSection />);

    expect(screen.getByText('api.partner.com')).toBeInTheDocument();
    expect(screen.getByText('*.stripe.com')).toBeInTheDocument();
    expect(screen.getByText('PARTNER')).toBeInTheDocument();
    expect(screen.getByText('STRIPE_WH')).toBeInTheDocument();
  });

  it('adding a host calls the allowlist mutation with the full new list', async () => {
    const mutate = vi.fn();
    setup({ setAllowlistMutate: mutate });
    const user = userEvent.setup();
    render(<BlueprintHttpSection />);

    await user.type(screen.getByPlaceholderText('adicionar host'), 'new.host.com');
    await user.click(screen.getByRole('button', { name: '+ Adicionar' }));

    expect(mutate).toHaveBeenCalledWith(['api.partner.com', '*.stripe.com', 'new.host.com']);
  });

  it('removing a chip calls the mutation with the filtered list', async () => {
    const mutate = vi.fn();
    setup({ setAllowlistMutate: mutate });
    const user = userEvent.setup();
    render(<BlueprintHttpSection />);

    await user.click(screen.getByRole('button', { name: /api\.partner\.com/ }));

    expect(mutate).toHaveBeenCalledWith(['*.stripe.com']);
  });

  it('shows the allowlist empty state', () => {
    setup({ settings: { blueprintHttpAllowlist: [] } });
    render(<BlueprintHttpSection />);

    expect(screen.getByText('Nenhum host liberado')).toBeInTheDocument();
  });

  it('shows the secrets empty state', () => {
    setup({ secrets: [] });
    render(<BlueprintHttpSection />);

    expect(screen.getByText('Nenhum segredo')).toBeInTheDocument();
  });

  it('shows a loading skeleton while settings or secrets are fetching', () => {
    setup({ secretsQuery: { data: undefined, isLoading: true } });
    render(<BlueprintHttpSection />);

    expect(screen.queryByText('PARTNER')).not.toBeInTheDocument();
    expect(document.querySelectorAll('[class*="sk"]').length).toBeGreaterThan(0);
  });

  it('opens the "Definir segredo" dialog, submits it, and never renders the value afterwards', async () => {
    const mutate = vi.fn((_vars, opts) => opts?.onSuccess?.());
    setup({ setSecretMutate: mutate });
    const user = userEvent.setup();
    render(<BlueprintHttpSection />);

    await user.click(screen.getByRole('button', { name: 'Definir segredo' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('NOME'), 'NEW_SECRET');
    await user.type(within(dialog).getByLabelText('VALOR'), 'super-secret-value');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    expect(mutate).toHaveBeenCalledWith({ name: 'NEW_SECRET', value: 'super-secret-value' }, expect.anything());
    expect(screen.queryByText('super-secret-value')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('super-secret-value')).not.toBeInTheDocument();
  });

  it('"Substituir" opens the dialog pre-filled with the secret name', async () => {
    const user = userEvent.setup();
    render(<BlueprintHttpSection />);

    await user.click(within(screen.getByText('PARTNER').closest('tr') as HTMLElement).getByRole('button', { name: 'Substituir' }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText('NOME')).toHaveValue('PARTNER');
  });

  it('remove is two-step and reverts to "Remover" after 5 seconds without deleting', () => {
    vi.useFakeTimers();
    const mutate = vi.fn();
    setup({ deleteSecretMutate: mutate });
    render(<BlueprintHttpSection />);

    const row = screen.getByText('PARTNER').closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: 'Remover' }));

    expect(within(row).getByRole('button', { name: 'Confirmar remoção' })).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(5000); });

    expect(within(row).getByRole('button', { name: 'Remover' })).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('confirming removal within the window calls the delete mutation', () => {
    vi.useFakeTimers();
    const mutate = vi.fn();
    setup({ deleteSecretMutate: mutate });
    render(<BlueprintHttpSection />);

    const row = screen.getByText('STRIPE_WH').closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: 'Remover' }));
    fireEvent.click(within(row).getByRole('button', { name: 'Confirmar remoção' }));

    expect(mutate).toHaveBeenCalledWith({ name: 'STRIPE_WH' }, expect.anything());
  });

  it('shows the toast error when saving a secret fails', async () => {
    const mutate = vi.fn((_vars, opts) => opts?.onError?.({ message: '' }));
    setup({ setSecretMutate: mutate });
    const user = userEvent.setup();
    render(<BlueprintHttpSection />);

    await user.click(screen.getByRole('button', { name: 'Definir segredo' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('NOME'), 'NEW_SECRET');
    await user.type(within(dialog).getByLabelText('VALOR'), 'v');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    expect(toast.error).toHaveBeenCalled();
  });
});
