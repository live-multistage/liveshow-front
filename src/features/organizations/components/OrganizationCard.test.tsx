import { describe, it, expect } from 'vitest';
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrganizationCard } from './OrganizationCard';
import type { OrganizationResponse } from '../types/organization.types';

function normalized(value: string): string {
  return value.replace(/\s+/g, ' ');
}

const baseOrg: OrganizationResponse = {
  id: 'org-1',
  name: 'Acme Shows',
  slug: 'acme-shows',
  ownerId: 'user-1',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('OrganizationCard', () => {
  it('renders real stats when provided by the backend', () => {
    const org: OrganizationResponse = {
      ...baseOrg,
      activeEventsCount: 4,
      memberCount: 7,
      salesThisMonth: [
        { currency: 'BRL', amount: 1200 },
        { currency: 'USD', amount: 50 },
      ],
    };

    render(<OrganizationCard organization={org} />);

    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText(normalized('R$ 1.200,00'))).toBeInTheDocument();
  });

  it('shows — for each stat slot when the backend has not provided the fields', () => {
    render(<OrganizationCard organization={baseOrg} />);

    const dashes = screen.getAllByText('—');
    expect(dashes).toHaveLength(3);
  });
});
