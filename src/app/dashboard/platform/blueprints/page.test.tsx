import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Spec D10: the `blueprints` flag only stops runs. Admins author, import and
// publish while it is OFF (rollout step 2), so these pages are SUPER_ADMIN-only
// (PlatformAdminGuard in the platform layout) and never flag-gated.
const { requireFeatureFlag, fetchFeatureFlags } = vi.hoisted(() => ({
  requireFeatureFlag: vi.fn(),
  fetchFeatureFlags: vi.fn().mockResolvedValue({ blueprints: false }),
}));
vi.mock('@/features/feature-flags', () => ({ requireFeatureFlag, fetchFeatureFlags }));
vi.mock('@/features/platform-admin/blueprints', () => ({
  BlueprintsPage: ({ blueprintsEnabled }: { blueprintsEnabled: boolean }) => <div>blueprints list · enabled={String(blueprintsEnabled)}</div>,
  BlueprintDetailPage: ({ id, blueprintsEnabled }: { id: string; blueprintsEnabled: boolean }) => <div>blueprint {id} · enabled={String(blueprintsEnabled)}</div>,
}));

import ListPage from './page';
import DetailPage from './[id]/page';

describe('platform blueprints pages', () => {
  it('render the list without gating on the blueprints flag', async () => {
    render(await ListPage());
    expect(screen.getByText('blueprints list · enabled=false')).toBeInTheDocument();
    expect(requireFeatureFlag).not.toHaveBeenCalled();
  });

  it('render the detail without gating on the blueprints flag', async () => {
    render(await DetailPage({ params: Promise.resolve({ id: 'b1' }) }));
    expect(screen.getByText('blueprint b1 · enabled=false')).toBeInTheDocument();
    expect(requireFeatureFlag).not.toHaveBeenCalled();
  });
});
