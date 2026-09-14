vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock('../queries/blueprints.queries', () => ({ useBlueprintsQuery: vi.fn() }));
vi.mock('../mutations/blueprints.mutations', () => ({ useCreateBlueprintMutation: vi.fn() }));

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BlueprintsPage } from './BlueprintsPage';
import { useBlueprintsQuery } from '../queries/blueprints.queries';
import { useCreateBlueprintMutation } from '../mutations/blueprints.mutations';

const create = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useBlueprintsQuery).mockReturnValue({ data: [
    { id: 'b1', name: 'Lembrete — comprou', description: '', status: 'ACTIVE', activeVersionId: 'v1', latestVersion: 2, counts7d: { started: 12, completed: 9, cancelled: 1, failed: 0 }, updatedAt: '2026-09-13T12:00:00Z' },
  ], isLoading: false, isError: false } as never);
  vi.mocked(useCreateBlueprintMutation).mockReturnValue({ mutate: create, isPending: false } as never);
});

describe('BlueprintsPage', () => {
  it('lists blueprints with status, version and 7-day counters, linking to the detail page', () => {
    render(<BlueprintsPage />);
    const row = screen.getByText('Lembrete — comprou').closest('tr')!;
    expect(within(row).getByText('status.ACTIVE')).toBeInTheDocument();
    expect(within(row).getByText('v2')).toBeInTheDocument();
    expect(within(row).getByText('12')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Lembrete — comprou' })).toHaveAttribute('href', '/dashboard/platform/blueprints/b1');
  });

  it('creates a blueprint from the inline form', async () => {
    render(<BlueprintsPage />);
    await userEvent.type(screen.getByLabelText('name'), 'Lembrete — salvou');
    await userEvent.click(screen.getByRole('button', { name: 'create' }));
    expect(create).toHaveBeenCalledWith({ name: 'Lembrete — salvou', description: '' }, expect.anything());
  });
});
