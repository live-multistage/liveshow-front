import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Spec D10: the `blueprints` flag only stops runs. Admins author, import and
// publish while it is OFF (rollout step 2), so these pages are SUPER_ADMIN-only
// (PlatformAdminGuard in the platform layout) and never flag-gated.
const { requireFeatureFlag } = vi.hoisted(() => ({ requireFeatureFlag: vi.fn() }));
vi.mock('@/features/feature-flags', () => ({ requireFeatureFlag }));
vi.mock('@/features/platform-admin/blueprints', () => ({
  BlueprintsPage: () => <div>blueprints list</div>,
  BlueprintDetailPage: ({ id }: { id: string }) => <div>blueprint {id}</div>,
}));

import ListPage from './page';
import DetailPage from './[id]/page';

describe('platform blueprints pages', () => {
  it('render the list without gating on the blueprints flag', async () => {
    render(await ListPage());
    expect(screen.getByText('blueprints list')).toBeInTheDocument();
    expect(requireFeatureFlag).not.toHaveBeenCalled();
  });

  it('render the detail without gating on the blueprints flag', async () => {
    render(await DetailPage({ params: Promise.resolve({ id: 'b1' }) }));
    expect(screen.getByText('blueprint b1')).toBeInTheDocument();
    expect(requireFeatureFlag).not.toHaveBeenCalled();
  });
});
