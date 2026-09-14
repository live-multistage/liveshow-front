vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string) => key;
    t.has = () => true;
    return t;
  },
}));
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { BlueprintVersionDto } from '@live-show/api-contracts';
import { AnalysisCard } from './AnalysisCard';

const graph = { schemaVersion: 1 as const, nodes: [], edges: [] };

describe('AnalysisCard', () => {
  it('shows "no errors" for a clean version', () => {
    const v: BlueprintVersionDto = { id: 'v2', version: 2, graph, analysis: { ok: true, errors: [] }, publishedAt: null };
    render(<AnalysisCard blueprintId="b1" version={v} />);
    expect(screen.getByText('detail.analysisOk')).toBeInTheDocument();
  });

  it('lists each error with translated code and a link into the editor', () => {
    const v: BlueprintVersionDto = {
      id: 'v3', version: 3, graph,
      analysis: { ok: false, errors: [{ nodeId: 'e2', code: 'BAD_REFERENCE', message: "field 'e6.title' not in scope" }] },
      publishedAt: null,
    };
    render(<AnalysisCard blueprintId="b1" version={v} />);
    expect(screen.getByText('errors.BAD_REFERENCE')).toBeInTheDocument();
    expect(screen.getByText("field 'e6.title' not in scope")).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'detail.viewInEditor' })).toHaveAttribute(
      'href', '/dashboard/platform/blueprints/b1/editor?version=v3&node=e2',
    );
  });
});
