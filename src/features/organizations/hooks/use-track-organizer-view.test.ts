import { describe, it, expect, vi, beforeEach } from 'vitest';

const trackMock = vi.fn();
vi.mock('@/lib/analytics/tracking', () => ({ useAnalytics: () => ({ track: trackMock }) }));

import { renderHook } from '@testing-library/react';
import { useTrackOrganizerView } from './use-track-organizer-view';

beforeEach(() => trackMock.mockClear());

describe('useTrackOrganizerView', () => {
  it('tracks once when the organization is known from the start', () => {
    renderHook(({ organizationId }) => useTrackOrganizerView(organizationId), {
      initialProps: { organizationId: 'org-1' },
    });

    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith('organizer_viewed', { organizationId: 'org-1' });
  });

  it('does not track while the id is undefined', () => {
    renderHook(({ organizationId }: { organizationId: string | undefined }) => useTrackOrganizerView(organizationId), {
      initialProps: { organizationId: undefined },
    });

    expect(trackMock).not.toHaveBeenCalled();
  });

  it('tracks again when the id changes', () => {
    const { rerender } = renderHook(
      ({ organizationId }: { organizationId: string | undefined }) => useTrackOrganizerView(organizationId),
      { initialProps: { organizationId: 'org-1' } },
    );
    rerender({ organizationId: 'org-2' });

    expect(trackMock).toHaveBeenCalledTimes(2);
    expect(trackMock).toHaveBeenLastCalledWith('organizer_viewed', { organizationId: 'org-2' });
  });
});
