import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PlatformEventRow } from '../../types/platform-admin.types';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('../../services/platform-admin.service', () => ({ platformAdminService: { getPlatformEvents: vi.fn() } }));
vi.mock('@/features/events/services/events.service', () => ({ eventsService: { getEvent: vi.fn() } }));

import { platformAdminService } from '../../services/platform-admin.service';
import { EventPicker, isFeaturableEventRow } from './EventPicker';

const row = (id: string, extra: Partial<PlatformEventRow>): PlatformEventRow => ({
  id, title: `Evento ${id}`, orgId: 'o', orgName: 'Org', status: 'PUBLISHED', startsAt: '2026-12-01T20:00:00Z', camerasCount: 1, category: 'MUSIC',
  thumbnailUrl: null, publiclyFunded: false, hasLibrasCamera: false, accessibilityApproved: false, moderationStatus: null, moderationReason: null,
  openReportsCount: 0, visibility: 'PUBLIC', ...extra,
});

const rows = [
  row('public', {}),
  row('unlisted', { visibility: 'UNLISTED' }),
  row('draft', { status: 'DRAFT' }),
  row('private', { visibility: 'PRIVATE' }),
  row('channel', { format: 'CHANNEL' }),
  row('cancelled', { status: 'CANCELLED' }),
];

async function search(featurable: boolean) {
  vi.mocked(platformAdminService.getPlatformEvents).mockResolvedValue({ items: rows, total: rows.length, page: 1, limit: 20 });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <EventPicker featurable={featurable} value={[]} max={1} onChange={vi.fn()} />
    </QueryClientProvider>,
  );
  await userEvent.type(screen.getByRole('searchbox'), 'ev');
  await screen.findByText('Evento public');
}

describe('EventPicker featurable', () => {
  it('offers public and UNLISTED events, not draft, private, channel or cancelled ones', async () => {
    await search(true);
    expect(screen.getByText('Evento unlisted')).toBeInTheDocument();
    for (const hidden of ['draft', 'private', 'channel', 'cancelled']) expect(screen.queryByText(`Evento ${hidden}`)).not.toBeInTheDocument();
  });

  it('keeps listing everything for the other users of the picker', async () => {
    await search(false);
    for (const { id } of rows) expect(screen.getByText(`Evento ${id}`)).toBeInTheDocument();
  });

  it('treats a row without visibility/format by its status alone', () => {
    expect(isFeaturableEventRow({ status: 'SCHEDULED' })).toBe(true);
    expect(isFeaturableEventRow({ status: 'DRAFT' })).toBe(false);
  });
});
