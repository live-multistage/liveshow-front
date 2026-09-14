vi.mock('next-intl', () => ({ useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key) }));
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
vi.mock('../mutations/blueprints.mutations', () => ({ usePublishBlueprintVersionMutation: vi.fn(), useActivateBlueprintMutation: vi.fn() }));

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { BlueprintDetail } from '@live-show/api-contracts';
import { VersionsCard } from './VersionsCard';
import { usePublishBlueprintVersionMutation, useActivateBlueprintMutation } from '../mutations/blueprints.mutations';

const publish = vi.fn();
const activate = vi.fn();
const onError = vi.fn();

const graph = { schemaVersion: 1 as const, nodes: [], edges: [] };

function blueprint(versions: BlueprintDetail['versions'], activeVersionId: string | null = null): BlueprintDetail {
  return {
    id: 'b1', name: 'Lembrete', description: '', status: 'ACTIVE', activeVersionId,
    latestVersion: versions[0]?.version ?? null, counts7d: { started: 0, completed: 0, cancelled: 0, failed: 0 },
    updatedAt: '2026-09-13T12:00:00Z', versions,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(usePublishBlueprintVersionMutation).mockReturnValue({ mutate: publish, isPending: false } as never);
  vi.mocked(useActivateBlueprintMutation).mockReturnValue({ mutate: activate, isPending: false } as never);
});

describe('VersionsCard', () => {
  it('offers Publicar for a clean draft', async () => {
    render(<VersionsCard blueprint={blueprint([{ id: 'v2', version: 2, graph, analysis: { ok: true, errors: [] }, publishedAt: null }])} onError={onError} />);
    await userEvent.click(screen.getByRole('button', { name: 'detail.publish' }));
    expect(publish).toHaveBeenCalledWith({ id: 'b1', versionId: 'v2' }, expect.anything());
  });

  it('offers Abrir no editor for a draft with errors instead of Publicar', () => {
    render(<VersionsCard blueprint={blueprint([{ id: 'v2', version: 2, graph, analysis: { ok: false, errors: [{ code: 'BAD_REFERENCE', message: 'x' }] }, publishedAt: null }])} onError={onError} />);
    expect(screen.queryByRole('button', { name: 'detail.publish' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'detail.openEditor' })).toHaveAttribute('href', '/dashboard/platform/blueprints/b1/editor?version=v2');
  });

  it('offers Ativar for a published, non-active version', async () => {
    render(<VersionsCard blueprint={blueprint([{ id: 'v1', version: 1, graph, analysis: { ok: true, errors: [] }, publishedAt: '2026-09-01T00:00:00Z' }])} onError={onError} />);
    await userEvent.click(screen.getByRole('button', { name: 'detail.activate' }));
    expect(activate).toHaveBeenCalledWith({ id: 'b1', versionId: 'v1' }, expect.anything());
  });

  it('shows the active version with no action', () => {
    render(<VersionsCard blueprint={blueprint([{ id: 'v1', version: 1, graph, analysis: { ok: true, errors: [] }, publishedAt: '2026-09-01T00:00:00Z' }], 'v1')} onError={onError} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('detail.active')).toBeInTheDocument();
  });
});
