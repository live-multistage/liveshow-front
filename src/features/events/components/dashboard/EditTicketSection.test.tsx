import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EditTicketSection } from './EditTicketSection';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

vi.mock('@live-show/design-system', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => <span />,
}));

const useEventStagesQueryMock = vi.fn(
  (_eventId: string | null): { stages: { id: string; name: string }[]; isLoading: boolean } => ({
    stages: [],
    isLoading: false,
  }),
);
vi.mock('../../../streams/queries/streams.queries', () => ({
  useEventStagesQuery: (eventId: string | null) => useEventStagesQueryMock(eventId),
}));

const STAGES = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    streamId: 'stream-1',
    name: 'Palco A',
    slug: 'palco-a',
    position: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

const createEventMutate = vi.fn();
const updateEventMutate = vi.fn();
const deleteEventMutate = vi.fn();
vi.mock('../../mutations/ticket-product.mutation', () => ({
  useCreateTicketProductMutation: () => ({
    mutate: createEventMutate,
    isPending: false,
    isError: false,
  }),
  useUpdateTicketProductMutation: () => ({
    mutate: updateEventMutate,
    isPending: false,
    isError: false,
  }),
  useDeleteTicketProductMutation: () => ({ mutate: deleteEventMutate, isPending: false }),
}));

const createSeriesMutate = vi.fn();
const updateSeriesMutate = vi.fn();
const deleteSeriesMutate = vi.fn();
vi.mock('../../../series/mutations/series.mutations', () => ({
  useCreateSeriesTicketProductMutation: () => ({
    mutate: createSeriesMutate,
    isPending: false,
    isError: false,
  }),
  useUpdateSeriesTicketProductMutation: () => ({
    mutate: updateSeriesMutate,
    isPending: false,
    isError: false,
  }),
  useDeleteSeriesTicketProductMutation: () => ({ mutate: deleteSeriesMutate, isPending: false }),
}));

const fillRequiredFields = () => {
  fireEvent.change(screen.getByPlaceholderText('namePlaceholder'), {
    target: { value: 'Passe da temporada' },
  });
  fireEvent.change(screen.getByPlaceholderText('descPlaceholder'), {
    target: { value: 'Acesso a todos os episódios' },
  });
  fireEvent.change(screen.getByPlaceholderText('0,00'), { target: { value: '150' } });
  fireEvent.click(screen.getByText('liveView'));
};

describe('EditTicketSection — eventId target (unchanged behavior)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useEventStagesQueryMock.mockReturnValue({ stages: [], isLoading: false });
  });

  it('creates through the event ticket-product mutation', async () => {
    render(<EditTicketSection eventId="evt-1" tickets={[]} />);
    fillRequiredFields();

    fireEvent.click(screen.getByText('add'));

    await waitFor(() => expect(createEventMutate).toHaveBeenCalled());
    expect(createSeriesMutate).not.toHaveBeenCalled();
  });

  it('still shows the stage selector and sends allowedStageIds for an event ticket', async () => {
    useEventStagesQueryMock.mockReturnValue({ stages: STAGES, isLoading: false });
    render(<EditTicketSection eventId="evt-1" tickets={[]} />);
    fillRequiredFields();

    expect(screen.getByText('Palco A')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Palco A'));
    fireEvent.click(screen.getByText('add'));

    await waitFor(() =>
      expect(createEventMutate).toHaveBeenCalledWith(
        expect.objectContaining({ allowedStageIds: ['11111111-1111-4111-8111-111111111111'] }),
        expect.anything(),
      ),
    );
  });
});

describe('EditTicketSection — seriesId target', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useEventStagesQueryMock.mockReturnValue({ stages: [], isLoading: false });
  });

  it('creates through the series ticket-product mutation with the seriesId', async () => {
    render(<EditTicketSection seriesId="series-1" stagesEventId="evt-template" tickets={[]} />);
    fillRequiredFields();

    fireEvent.click(screen.getByText('add'));

    await waitFor(() =>
      expect(createSeriesMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          seriesId: 'series-1',
          input: expect.objectContaining({ name: 'Passe da temporada' }),
        }),
        expect.anything(),
      ),
    );
    expect(createEventMutate).not.toHaveBeenCalled();
  });

  it('never renders the stage selector, even with stages available', () => {
    useEventStagesQueryMock.mockReturnValue({ stages: STAGES, isLoading: false });
    render(<EditTicketSection seriesId="series-1" stagesEventId="evt-template" tickets={[]} />);
    fillRequiredFields();

    expect(screen.queryByText('Palco A')).not.toBeInTheDocument();
  });

  it('submits without an allowedStageIds key in the body (backend 400s if present)', async () => {
    useEventStagesQueryMock.mockReturnValue({ stages: STAGES, isLoading: false });
    render(<EditTicketSection seriesId="series-1" stagesEventId="evt-template" tickets={[]} />);
    fillRequiredFields();

    fireEvent.click(screen.getByText('add'));

    await waitFor(() => expect(createSeriesMutate).toHaveBeenCalled());
    const call = createSeriesMutate.mock.calls[0][0];
    expect(call.input).not.toHaveProperty('allowedStageIds');
  });

  it('deletes through the series ticket-product mutation with the seriesId and productId', () => {
    render(
      <EditTicketSection
        seriesId="series-1"
        tickets={[
          {
            id: 'prod-1',
            name: 'Passe',
            description: 'Passe da temporada',
            price: 100,
            currency: 'BRL',
            capabilities: ['LIVE_VIEW'],
            camerasLimit: null,
            allowedStageIds: [],
            capacity: null,
            immutable: false,
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByLabelText('remove'));

    expect(deleteSeriesMutate).toHaveBeenCalledWith({ seriesId: 'series-1', productId: 'prod-1' });
    expect(deleteEventMutate).not.toHaveBeenCalled();
  });

  it('updates through the series ticket-product mutation when editing an existing product', async () => {
    render(
      <EditTicketSection
        seriesId="series-1"
        tickets={[
          {
            id: 'prod-1',
            name: 'Passe',
            description: 'Passe da temporada',
            price: 100,
            currency: 'BRL',
            capabilities: ['LIVE_VIEW'],
            camerasLimit: null,
            allowedStageIds: [],
            capacity: null,
            immutable: false,
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByLabelText('edit'));
    fireEvent.click(screen.getByText('save'));

    await waitFor(() =>
      expect(updateSeriesMutate).toHaveBeenCalledWith(
        expect.objectContaining({ seriesId: 'series-1', productId: 'prod-1' }),
        expect.anything(),
      ),
    );
    expect(updateEventMutate).not.toHaveBeenCalled();
  });
});
