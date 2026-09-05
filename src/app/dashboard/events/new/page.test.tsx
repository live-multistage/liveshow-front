import { describe, it, expect, vi } from 'vitest';
import { DEFAULT_FEATURE_FLAGS } from '@/features/feature-flags';

const fetchFeatureFlags = vi.fn();
vi.mock('@/features/feature-flags', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchFeatureFlags,
}));

vi.mock('@/features/events', () => ({ CreateEventPageContent: 'CreateEventPageContent' }));

import CreateEventPage from './page';

describe('CreateEventPage', () => {
  it('fails physical_tickets open even when the global flag is off', async () => {
    fetchFeatureFlags.mockResolvedValue({ ...DEFAULT_FEATURE_FLAGS, physical_tickets: false });

    const element = await CreateEventPage();

    expect(element.props.physicalTicketsEnabled).toBe(true);
  });
});
