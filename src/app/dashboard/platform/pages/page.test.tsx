import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const { requireFeatureFlag } = vi.hoisted(() => ({ requireFeatureFlag: vi.fn() }));
vi.mock('@/features/feature-flags', () => ({ requireFeatureFlag }));
vi.mock('@/features/platform-admin/pages/components/PagesListPage', () => ({ PagesListPage: () => <div>pages list</div> }));

import Page from './page';

describe('platform pages list route', () => {
  it('is gated on the page_builder flag', async () => {
    render(await Page());
    expect(requireFeatureFlag).toHaveBeenCalledWith('page_builder');
    expect(screen.getByText('pages list')).toBeInTheDocument();
  });
});
