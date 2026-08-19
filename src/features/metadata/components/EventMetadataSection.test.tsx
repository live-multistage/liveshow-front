import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../queries/use-event-metadata', () => ({
  useEventMetadataQuery: vi.fn(),
  metadataKeys: { eventMetadata: (eventId: string) => ['metadata', 'EVENT', eventId] },
}));
vi.mock('../mutations/add-metadata.mutation', () => ({
  useAddMetadataMutation: vi.fn(() => ({ isPending: false, error: null, mutate: vi.fn() })),
}));
vi.mock('../mutations/update-metadata.mutation', () => ({
  useUpdateMetadataMutation: vi.fn(() => ({ isPending: false, error: null, mutate: vi.fn() })),
}));
vi.mock('../mutations/delete-metadata.mutation', () => ({
  useDeleteMetadataMutation: vi.fn(() => ({ isPending: false, mutate: vi.fn() })),
}));

import { render, screen } from '@testing-library/react';
import { EventMetadataSection } from './EventMetadataSection';
import { useEventMetadataQuery } from '../queries/use-event-metadata';
import type { MetadataResponse } from '../types/metadata.types';

function makeEntry(overrides: Partial<MetadataResponse> = {}): MetadataResponse {
  return {
    id: 'meta-1',
    ownerType: 'EVENT',
    ownerId: 'evt-1',
    key: 'ticket_limit',
    value: '500',
    valueType: 'STRING',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('EventMetadataSection readOnly', () => {
  beforeEach(() => {
    vi.mocked(useEventMetadataQuery).mockReturnValue({
      data: [makeEntry()],
      isLoading: false,
    } as unknown as ReturnType<typeof useEventMetadataQuery>);
  });

  it('shows Add/Edit/Delete controls by default', () => {
    render(<EventMetadataSection eventId="evt-1" />);

    expect(screen.getByText('Adicionar')).toBeInTheDocument();
    expect(screen.getByTitle('Editar')).toBeInTheDocument();
    expect(screen.getByTitle('Remover')).toBeInTheDocument();
  });

  it('hides Add/Edit/Delete controls when readOnly, keeps entries visible', () => {
    render(<EventMetadataSection eventId="evt-1" readOnly />);

    expect(screen.queryByText('Adicionar')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Editar')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Remover')).not.toBeInTheDocument();
    expect(screen.getByText('ticket_limit')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
  });
});
