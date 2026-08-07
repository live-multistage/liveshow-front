import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('../hooks/use-organizations', () => ({
  useOrganizations: vi.fn(),
}));
vi.mock('@/features/account', () => ({
  useAuth: vi.fn(),
}));
import { render, screen, within } from '@testing-library/react';
import { OrganizationListPage } from './OrganizationListPage';
import { useOrganizations } from '../hooks/use-organizations';
import { useAuth } from '@/features/account';
import type { OrganizationResponse } from '../types/organization.types';

function normalized(value: string): string {
  return value.replace(/\s+/g, ' ');
}

const mockedUseOrganizations = vi.mocked(useOrganizations);
const mockedUseAuth = vi.mocked(useAuth);

function makeOrg(overrides: Partial<OrganizationResponse>): OrganizationResponse {
  return {
    id: overrides.id ?? 'org-1',
    name: overrides.name ?? 'Org',
    slug: overrides.slug ?? 'org',
    ownerId: 'user-1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedUseAuth.mockReturnValue({ user: { id: 'user-1' } } as ReturnType<typeof useAuth>);
});

describe('OrganizationListPage header KPIs', () => {
  it('sums real stats across organizations', () => {
    const orgs: OrganizationResponse[] = [
      makeOrg({ id: 'org-1', activeEventsCount: 3, memberCount: 10, salesThisMonth: [{ currency: 'BRL', amount: 100 }] }),
      makeOrg({ id: 'org-2', activeEventsCount: 2, memberCount: 5, salesThisMonth: [{ currency: 'BRL', amount: 50 }] }),
    ];
    mockedUseOrganizations.mockReturnValue({
      data: orgs,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useOrganizations>);

    const { container } = render(<OrganizationListPage />);

    const kpiStrip = container.querySelector('[class*="kpiStrip"]') as HTMLElement;
    expect(kpiStrip).toBeTruthy();
    expect(within(kpiStrip).getByText('5')).toBeInTheDocument();
    expect(within(kpiStrip).getByText('15')).toBeInTheDocument();
    expect(within(kpiStrip).getByText(normalized('150,00'))).toBeInTheDocument();
  });

  it('shows — instead of a fabricated 0 when stat fields are absent from the backend response', () => {
    const orgs: OrganizationResponse[] = [makeOrg({ id: 'org-1' }), makeOrg({ id: 'org-2' })];
    mockedUseOrganizations.mockReturnValue({
      data: orgs,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useOrganizations>);

    const { container } = render(<OrganizationListPage />);

    const kpiStrip = container.querySelector('[class*="kpiStrip"]') as HTMLElement;
    expect(kpiStrip).toBeTruthy();
    const dashes = within(kpiStrip).getAllByText('—');
    expect(dashes).toHaveLength(3);
  });
});
