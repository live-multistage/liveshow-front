vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@tanstack/react-query', () => ({ useQuery: vi.fn() }));
vi.mock('../hooks/use-auth', () => ({ useAuth: () => ({ logout: vi.fn() }) }));
vi.mock('../mutations/upload-avatar.mutation', () => ({ useUploadAvatarMutation: () => ({ mutate: vi.fn(), isPending: false }) }));
vi.mock('../mutations/change-password.mutation', () => ({ useChangePasswordMutation: () => ({ mutate: vi.fn(), isPending: false }) }));
vi.mock('../mutations/disable-account.mutation', () => ({ useDisableAccountMutation: () => ({ mutate: vi.fn(), isPending: false }) }));
vi.mock('../queries/get-sessions', () => ({
  useSessionsQuery: () => ({ data: { pages: [] }, fetchNextPage: vi.fn(), hasNextPage: false, isFetchingNextPage: false }),
}));
vi.mock('../mutations/revoke-session.mutation', () => ({ useRevokeSessionMutation: () => ({ mutate: vi.fn(), isPending: false }) }));
vi.mock('../queries/get-notification-preferences', () => ({
  useNotificationPreferencesQuery: () => ({ data: undefined }),
  useUpdateNotificationPreferencesMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('@/lib/analytics/consent', () => ({ useAnalyticsConsent: () => ({ consent: null, setConsent: vi.fn() }) }));
vi.mock('@/features/consent/privacy.service', () => ({ privacyService: { syncConsent: vi.fn(), exportData: vi.fn(), deleteAnalyticsData: vi.fn() } }));

let updateProfileMutate: ReturnType<typeof vi.fn>;
vi.mock('../mutations/update-profile.mutation', () => ({
  useUpdateProfileMutation: () => ({ mutate: updateProfileMutate, isPending: false, error: null }),
}));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import { SettingsPageContent } from './SettingsPageContent';

const me = {
  id: 'u1',
  displayName: 'Ysrael Moreno',
  email: 'ysrael@example.com',
  phone: null,
  taxDocument: null,
  bio: null,
  avatarUrl: null,
  role: 'USER',
  createdAt: '2026-01-01T00:00:00Z',
  analyticsConsent: null,
};

describe('SettingsPageContent — taxDocument validation', () => {
  beforeEach(() => {
    updateProfileMutate = vi.fn();
    vi.mocked(useQuery).mockReturnValue({ data: me, isLoading: false } as never);
  });

  it('shows the field error and does not call the mutation for an invalid CPF/CNPJ', async () => {
    render(<SettingsPageContent twoFactorEnabled={false} />);

    const taxDocumentInput = screen.getByPlaceholderText('000.000.000-00');
    fireEvent.change(taxDocumentInput, { target: { value: '123' } });

    const forms = document.querySelectorAll('form');
    fireEvent.submit(forms[0]);

    await waitFor(() => expect(screen.getByText('CPF ou CNPJ inválido.')).toBeInTheDocument());
    expect(updateProfileMutate).not.toHaveBeenCalled();
  });
});
