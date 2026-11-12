import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/features/marketing/components/organizers/HeroPlayerMock', () => ({ HeroPlayerMock: () => <div /> }));
vi.mock('@/features/account/hooks/use-auth', () => ({ useAuth: () => ({ isLoggedIn: false }) }));

import { organizerCtaHref } from '@/features/marketing/constants';
import { OrganizerAcquisitionHero } from './OrganizerAcquisitionHero';

describe('OrganizerAcquisitionHero', () => {
  it('links both CTAs to the partner signup and explains the product', () => {
    render(<OrganizerAcquisitionHero />);

    const ctas = screen.getAllByRole('link', { name: /^cta/ });
    expect(ctas).toHaveLength(2);
    ctas.forEach((a) => expect(a).toHaveAttribute('href', organizerCtaHref(false)));
    expect(screen.getByRole('link', { name: 'secondary' })).toHaveAttribute('href', '/be-partner');
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('disables the CTAs and hides the hint when applications are closed', () => {
    render(<OrganizerAcquisitionHero applicationsOpen={false} />);

    expect(screen.queryByRole('link', { name: /^cta/ })).not.toBeInTheDocument();
    screen.getAllByRole('button', { name: 'ctaClosed' }).forEach((b) => expect(b).toBeDisabled());
    expect(screen.queryByText('ctaHint')).not.toBeInTheDocument();
  });
});
