import { describe, it, expect, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

let mockIsLoggedIn = false;
vi.mock('@/features/account/hooks/use-auth', () => ({
  useAuth: () => ({ isLoggedIn: mockIsLoggedIn }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { render, screen } from '@testing-library/react';
import { FinalCta } from './FinalCta';

describe('FinalCta', () => {
  it('renders the title', () => {
    mockIsLoggedIn = false;
    render(<FinalCta />);
    expect(screen.getByText('finalCta.title')).toBeInTheDocument();
  });

  it('sends a logged-out visitor to register with a redirect back to create-organization', () => {
    mockIsLoggedIn = false;
    render(<FinalCta />);
    expect(screen.getByRole('link', { name: 'finalCta.cta' })).toHaveAttribute(
      'href',
      '/register?redirect=%2Fdashboard%2Forganizations%2Fnew',
    );
  });

  it('links the help CTA to /help', () => {
    mockIsLoggedIn = false;
    render(<FinalCta />);
    expect(screen.getByRole('link', { name: /finalCta\.helpLink/ })).toHaveAttribute('href', '/help');
  });
});
