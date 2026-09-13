vi.mock('next-intl', () => ({ useTranslations: () => (key: string, vars?: Record<string, unknown>) => (vars ? `${key} ${JSON.stringify(vars)}` : key) }));
vi.mock('@/features/channels', () => ({ useChannelsQuery: () => ({ data: [] }) }));
vi.mock('./EventPicker', () => ({ EventPicker: () => <div data-testid="event-picker" /> }));
vi.mock('@/features/collaborations/services/collaborations.service', () => ({
  collaborationsService: { searchOrganizations: vi.fn() },
}));
vi.mock('@/features/artists/services/artist.service', () => ({
  artistService: { search: vi.fn() },
}));

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { AudienceFields, emptyAudience } from './AudienceFields';
import { OrganizationPicker } from './OrganizationPicker';
import { collaborationsService } from '@/features/collaborations/services/collaborations.service';

function renderWithClient(ui: ReactNode) {
  const client = new QueryClient();
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const count = { isLoading: false, isError: false, data: undefined };

// jsdom doesn't implement these — Radix Select needs them to open/select.
beforeEach(() => {
  vi.clearAllMocks();
  window.HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

describe('AudienceFields', () => {
  it('shows a number input with default 24 for ABANDONED_CARTS', () => {
    renderWithClient(
      <AudienceFields value={{ type: 'ABANDONED_CARTS', olderThanHours: 24 }} onChange={vi.fn()} category="MARKETING" count={count} />,
    );
    expect(screen.getByRole('spinbutton', { name: 'audience.param.olderThanHours' })).toHaveValue(24);
  });

  it('renders an ArtistPicker for ARTIST_FOLLOWERS', () => {
    renderWithClient(
      <AudienceFields value={{ type: 'ARTIST_FOLLOWERS', artistId: '' }} onChange={vi.fn()} category="MARKETING" count={count} />,
    );
    expect(screen.getByPlaceholderText('audience.artistPlaceholder')).toBeInTheDocument();
  });

  it('renders two enum selects for APPLICANTS', () => {
    renderWithClient(
      <AudienceFields
        value={{ type: 'APPLICANTS', applicationKind: 'ORGANIZER', applicationStatus: 'PENDING' }}
        onChange={vi.fn()}
        category="MARKETING"
        count={count}
      />,
    );
    expect(screen.getByRole('combobox', { name: 'audience.param.applicationKind' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'audience.param.applicationStatus' })).toBeInTheDocument();
  });

  it('resets params when the type switches', async () => {
    const onChange = vi.fn();
    renderWithClient(
      <AudienceFields value={{ type: 'ABANDONED_CARTS', olderThanHours: 24 }} onChange={onChange} category="MARKETING" count={count} />,
    );
    await userEvent.click(screen.getByRole('combobox', { name: 'audience.typeLabel' }));
    await userEvent.click(screen.getByRole('option', { name: /audience\.type\.PENDING_ORDERS/ }));
    expect(onChange).toHaveBeenCalledWith({ type: 'PENDING_ORDERS', olderThanHours: 1 });
  });

  it('carries over the current country when the type switches', async () => {
    const onChange = vi.fn();
    renderWithClient(
      <AudienceFields
        value={{ type: 'ABANDONED_CARTS', olderThanHours: 24, country: 'BR' }}
        onChange={onChange}
        category="MARKETING"
        count={count}
      />,
    );
    await userEvent.click(screen.getByRole('combobox', { name: 'audience.typeLabel' }));
    await userEvent.click(screen.getByRole('option', { name: /audience\.type\.PENDING_ORDERS/ }));
    expect(onChange).toHaveBeenCalledWith({ type: 'PENDING_ORDERS', olderThanHours: 1, country: 'BR' });
  });
});

describe('emptyAudience', () => {
  it('fills int defaults from the spec', () => {
    expect(emptyAudience('ABANDONED_CARTS')).toEqual({ type: 'ABANDONED_CARTS', olderThanHours: 24 });
    expect(emptyAudience('APPLICANTS')).toEqual({ type: 'APPLICANTS', applicationKind: 'ORGANIZER', applicationStatus: 'PENDING' });
  });

  it('omits optional params', () => {
    expect(emptyAudience('CHANNEL_EXPIRING')).toEqual({ type: 'CHANNEL_EXPIRING', withinDays: 7 });
    expect(emptyAudience('ORG_MEMBERS')).toEqual({ type: 'ORG_MEMBERS' });
  });
});

describe('OrganizationPicker', () => {
  it('searches after 2 characters and selects a result', async () => {
    vi.mocked(collaborationsService.searchOrganizations).mockResolvedValue([{ id: 'o1', name: 'Acme', logoUrl: null }]);
    const onChange = vi.fn();
    renderWithClient(<OrganizationPicker label="Organização" value={undefined} onChange={onChange} />);

    expect(collaborationsService.searchOrganizations).not.toHaveBeenCalled();
    await userEvent.type(screen.getByPlaceholderText('audience.organizationPlaceholder'), 'Ac');

    expect(await screen.findByRole('button', { name: 'Acme' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Acme' }));
    expect(onChange).toHaveBeenCalledWith('o1');
  });
});
