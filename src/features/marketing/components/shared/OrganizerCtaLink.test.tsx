import { describe, it, expect, vi } from 'vitest';

let mockIsLoggedIn = false;
vi.mock('@/features/account/hooks/use-auth', () => ({
  useAuth: () => ({ isLoggedIn: mockIsLoggedIn }),
}));

import { render, screen } from '@testing-library/react';
import { OrganizerCtaLink } from './OrganizerCtaLink';

describe('OrganizerCtaLink', () => {
  it('sends a logged-out visitor to register with a redirect back to create-organization', () => {
    mockIsLoggedIn = false;
    render(<OrganizerCtaLink>Criar minha organização</OrganizerCtaLink>);
    expect(screen.getByRole('link').getAttribute('href')).toBe('/register?redirect=%2Fdashboard%2Forganizations%2Fnew');
  });

  it('sends a logged-in organizer straight to the create-organization flow', () => {
    mockIsLoggedIn = true;
    render(<OrganizerCtaLink>Criar minha organização</OrganizerCtaLink>);
    expect(screen.getByRole('link').getAttribute('href')).toBe('/dashboard/organizations/new');
  });
});
