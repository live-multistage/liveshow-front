vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock('../queries/blueprints.queries', () => ({ useBlueprintQuery: vi.fn(), useBlueprintRunsQuery: vi.fn() }));
vi.mock('../mutations/blueprints.mutations', () => ({
  useSaveBlueprintVersionMutation: vi.fn(), usePublishBlueprintVersionMutation: vi.fn(),
  useActivateBlueprintMutation: vi.fn(), useDeactivateBlueprintMutation: vi.fn(),
}));

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BlueprintDetailPage } from './BlueprintDetailPage';
import { useBlueprintQuery, useBlueprintRunsQuery } from '../queries/blueprints.queries';
import {
  useActivateBlueprintMutation, useDeactivateBlueprintMutation, usePublishBlueprintVersionMutation, useSaveBlueprintVersionMutation,
} from '../mutations/blueprints.mutations';

const graph = { schemaVersion: 1, nodes: [], edges: [] };
const save = vi.fn(); const publish = vi.fn(); const activate = vi.fn(); const deactivate = vi.fn();

function detail(versions: unknown[], activeVersionId: string | null = null) {
  vi.mocked(useBlueprintQuery).mockReturnValue({ data: {
    id: 'b1', name: 'Lembrete', description: '', status: activeVersionId ? 'ACTIVE' : 'INACTIVE', activeVersionId,
    latestVersion: 2, counts7d: { started: 0, completed: 0, cancelled: 0, failed: 0 }, updatedAt: '2026-09-13T12:00:00Z', versions,
  }, isLoading: false, isError: false } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useBlueprintRunsQuery).mockReturnValue({ data: { items: [
    { id: 'r1', versionId: 'v1', version: 1, status: 'WAITING', currentNodeId: 'c', wakeAt: '2026-10-02T18:00:00Z', errorCode: null, createdAt: '2026-10-01T10:00:00Z', updatedAt: '2026-10-01T10:00:00Z', steps: [] },
  ], nextCursor: null }, isLoading: false } as never);
  vi.mocked(useSaveBlueprintVersionMutation).mockReturnValue({ mutate: save, isPending: false } as never);
  vi.mocked(usePublishBlueprintVersionMutation).mockReturnValue({ mutate: publish, isPending: false } as never);
  vi.mocked(useActivateBlueprintMutation).mockReturnValue({ mutate: activate, isPending: false } as never);
  vi.mocked(useDeactivateBlueprintMutation).mockReturnValue({ mutate: deactivate, isPending: false } as never);
});

describe('BlueprintDetailPage', () => {
  it('rejects invalid JSON locally and saves parsed JSON as a draft', async () => {
    detail([]);
    render(<BlueprintDetailPage id="b1" />);
    const box = screen.getByLabelText('detail.importTitle');
    fireEvent.change(box, { target: { value: '{ nope' } });
    await userEvent.click(screen.getByRole('button', { name: 'detail.save' }));
    expect(screen.getByRole('alert')).toHaveTextContent('detail.invalidJson');
    expect(save).not.toHaveBeenCalled();
    fireEvent.change(box, { target: { value: JSON.stringify(graph) } });
    await userEvent.click(screen.getByRole('button', { name: 'detail.save' }));
    expect(save).toHaveBeenCalledWith({ id: 'b1', graph }, expect.anything());
  });

  it('shows analysis errors of the latest version with translated codes; publish only for clean drafts', () => {
    detail([
      { id: 'v2', version: 2, graph, analysis: { ok: false, errors: [{ nodeId: 'n', code: 'BAD_REFERENCE', message: '{{x.y}} is not available here' }] }, publishedAt: null },
      { id: 'v1', version: 1, graph, analysis: { ok: true, errors: [] }, publishedAt: null },
    ]);
    render(<BlueprintDetailPage id="b1" />);
    expect(screen.getByText('errors.BAD_REFERENCE')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'detail.publish' })).toHaveLength(1);
  });

  it('activates a published version and deactivates the active blueprint', async () => {
    detail([{ id: 'v1', version: 1, graph, analysis: { ok: true, errors: [] }, publishedAt: '2026-09-13T12:00:00Z' }]);
    const { rerender } = render(<BlueprintDetailPage id="b1" />);
    await userEvent.click(screen.getByRole('button', { name: 'detail.activate' }));
    expect(activate).toHaveBeenCalledWith({ id: 'b1', versionId: 'v1' }, expect.anything());
    detail([{ id: 'v1', version: 1, graph, analysis: { ok: true, errors: [] }, publishedAt: '2026-09-13T12:00:00Z' }], 'v1');
    rerender(<BlueprintDetailPage id="b1" />);
    await userEvent.click(screen.getByRole('button', { name: 'detail.deactivate' }));
    expect(deactivate).toHaveBeenCalledWith({ id: 'b1' }, expect.anything());
  });

  it('lists recent runs with status and current node', () => {
    detail([]);
    render(<BlueprintDetailPage id="b1" />);
    expect(screen.getByText('runStatus.WAITING')).toBeInTheDocument();
    expect(screen.getByText('c')).toBeInTheDocument();
  });
});
