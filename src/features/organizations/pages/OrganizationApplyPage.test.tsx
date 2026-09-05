import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let mockIsLoggedIn = false;
const mockIsLoading = { value: false };
vi.mock('@/features/account/hooks/use-auth', () => ({
  useAuth: () => ({ isLoggedIn: mockIsLoggedIn, isLoading: mockIsLoading.value }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// Capture the onSuccess passed to the real hook and let the mock trigger it.
let capturedOnSuccess: (() => void) | undefined;
const mutate = vi.fn(() => capturedOnSuccess?.());
vi.mock('../hooks/use-create-organization', () => ({
  useCreateOrganization: (onSuccess: () => void) => {
    capturedOnSuccess = onSuccess;
    return { mutate, isPending: false, error: null };
  },
}));

// Stand-in form: exposes a submit that drives the mutation.
vi.mock('../components/OrganizationForm', () => ({
  OrganizationForm: ({ onSubmit }: { onSubmit: (v: unknown) => void }) => (
    <button type="button" onClick={() => onSubmit({ name: 'Acme', slug: 'acme', description: '' })}>
      form-submit
    </button>
  ),
}));

import { OrganizationApplyContent } from './OrganizationApplyPage';

describe('OrganizationApplyContent', () => {
  beforeEach(() => {
    mockIsLoggedIn = false;
    mockIsLoading.value = false;
    capturedOnSuccess = undefined;
    mutate.mockClear();
  });

  it('prompts a logged-out visitor to register with a redirect back to apply', () => {
    render(<OrganizationApplyContent />);
    expect(screen.getByRole('link', { name: /Criar conta/ })).toHaveAttribute(
      'href',
      '/register?redirect=%2Fbe-partner%2Fapply',
    );
    expect(screen.getByRole('link', { name: /Já tenho conta/ })).toHaveAttribute(
      'href',
      '/login?redirect=%2Fbe-partner%2Fapply',
    );
    expect(screen.queryByText('form-submit')).not.toBeInTheDocument();
  });

  it('renders the organization form when authenticated', () => {
    mockIsLoggedIn = true;
    render(<OrganizationApplyContent />);
    expect(screen.getByText('form-submit')).toBeInTheDocument();
  });

  it('shows the pending-review success panel after a successful submit', async () => {
    mockIsLoggedIn = true;
    render(<OrganizationApplyContent />);
    await userEvent.click(screen.getByText('form-submit'));
    expect(mutate).toHaveBeenCalledWith({ name: 'Acme', slug: 'acme', description: '' });
    expect(screen.getByText('Recebemos sua candidatura')).toBeInTheDocument();
  });
});
