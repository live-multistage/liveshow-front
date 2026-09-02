import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireFeatureFlag } from './require-feature-flag.server';
import { fetchFeatureFlags } from './get-feature-flags.server';
import { DEFAULT_FEATURE_FLAGS } from '../types/feature-flags.types';

vi.mock('./get-feature-flags.server', () => ({ fetchFeatureFlags: vi.fn() }));
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

const mockedFetch = vi.mocked(fetchFeatureFlags);

describe('requireFeatureFlag', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the flags when the key is enabled', async () => {
    mockedFetch.mockResolvedValue({ ...DEFAULT_FEATURE_FLAGS, linear_channels: true });
    await expect(requireFeatureFlag('linear_channels')).resolves.toEqual(
      expect.objectContaining({ linear_channels: true }),
    );
  });

  it('calls notFound when the key is disabled', async () => {
    mockedFetch.mockResolvedValue({ ...DEFAULT_FEATURE_FLAGS, linear_channels: false });
    await expect(requireFeatureFlag('linear_channels')).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
