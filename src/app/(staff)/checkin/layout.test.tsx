import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// physical_tickets fails open here (no member-readable org flag endpoint yet
// — see TODO in get-feature-flags.server.ts), so the layout must never 404
// regardless of the global flag value.
const requireFeatureFlag = vi.fn();
vi.mock('@/features/feature-flags', () => ({ requireFeatureFlag }));

import CheckinLayout from './layout';

describe('CheckinLayout', () => {
  it('renders children without gating on the global feature flag', () => {
    render(<CheckinLayout>{<div>check-in content</div>}</CheckinLayout>);

    expect(screen.getByText('check-in content')).toBeInTheDocument();
    expect(requireFeatureFlag).not.toHaveBeenCalled();
  });
});
