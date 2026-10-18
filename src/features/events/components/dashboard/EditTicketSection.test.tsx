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
const useEventStreamsQueryMock = vi.fn((_eventId: string | null) => ({ data: [] as unknown[], isLoading: false }));
vi.mock('../../../streams/queries/streams.queries', () => ({
  useEventStagesQuery: (eventId: string | null) => useEventStagesQueryMock(eventId),
  useEventStreamsQuery: (eventId: string | null) => useEventStreamsQueryMock(eventId),
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

const fillRequiredFields = () => {
  fireEvent.change(screen.getByPlaceholderText('namePlaceholder'), {
    target: { value: 'Pista' },
  });
  fireEvent.change(screen.getByPlaceholderText('descPlaceholder'), {
    target: { value: 'Acesso ao show' },
  });
  fireEvent.change(screen.getByPlaceholderText('0,00'), { target: { value: '150' } });
  fireEvent.click(screen.getByText('liveView'));
};

describe('EditTicketSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useEventStagesQueryMock.mockReturnValue({ stages: [], isLoading: false });
    useEventStreamsQueryMock.mockReturnValue({ data: [], isLoading: false });
  });

  it('creates through the event ticket-product mutation', async () => {
    render(<EditTicketSection eventId="evt-1" tickets={[]} />);
    fillRequiredFields();

    fireEvent.click(screen.getByText('add'));

    await waitFor(() => expect(createEventMutate).toHaveBeenCalled());
  });

  it('shows the stage selector and sends allowedStageIds for an event ticket', async () => {
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

  it('deletes through the event ticket-product mutation', () => {
    render(
      <EditTicketSection
        eventId="evt-1"
        tickets={[
          {
            id: 'prod-1',
            name: 'Pista',
            description: 'Acesso ao show',
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

    expect(deleteEventMutate).toHaveBeenCalledWith('prod-1');
  });

  it('updates through the event ticket-product mutation when editing an existing product', async () => {
    render(
      <EditTicketSection
        eventId="evt-1"
        tickets={[
          {
            id: 'prod-1',
            name: 'Pista',
            description: 'Acesso ao show',
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
      expect(updateEventMutate).toHaveBeenCalledWith(
        expect.objectContaining({ ticketId: 'prod-1' }),
        expect.anything(),
      ),
    );
  });

  it('hides the physical-entry option when the flag is explicitly off', () => {
    render(<EditTicketSection eventId="evt-1" tickets={[]} physicalTicketsEnabled={false} />);
    expect(screen.queryByText('Acesso presencial')).not.toBeInTheDocument();
  });

  it('offers the physical-entry option when the flag is on', () => {
    render(<EditTicketSection eventId="evt-1" tickets={[]} physicalTicketsEnabled />);
    expect(screen.getByText('Acesso presencial')).toBeInTheDocument();
  });

  // A missing prop must never silently hide the feature — the server prop
  // is the source of truth, so a forgotten wiring defaults to visible.
  it('defaults to offering the physical-entry option when the prop is omitted', () => {
    render(<EditTicketSection eventId="evt-1" tickets={[]} />);
    expect(screen.getByText('Acesso presencial')).toBeInTheDocument();
  });

  it('still displays an existing physical-entry ticket when the flag is off', () => {
    render(
      <EditTicketSection
        eventId="evt-1"
        tickets={[
          {
            id: 'prod-1',
            name: 'Presencial',
            description: 'Acesso ao local',
            price: 100,
            currency: 'BRL',
            capabilities: ['LIVE_VIEW', 'PHYSICAL_ENTRY'],
            camerasLimit: null,
            allowedStageIds: [],
            capacity: 500,
            immutable: false,
          },
        ]}
      />,
    );

    expect(screen.getByText('Presencial')).toBeInTheDocument();
  });

  it("keeps a ticket's transmission restriction when it is edited and saved", async () => {
    const VIP = '22222222-2222-4222-8222-222222222222';
    render(
      <EditTicketSection
        eventId="evt-1"
        tickets={[
          {
            id: 't1',
            name: 'VIP',
            description: 'Acesso VIP',
            price: 10,
            currency: 'BRL',
            capabilities: ['LIVE_VIEW'],
            camerasLimit: null,
            allowedStageIds: [],
            allowedStreamIds: [VIP],
            capacity: null,
            immutable: false,
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByLabelText('edit'));
    fireEvent.click(screen.getByText('save'));

    await waitFor(() => expect(updateEventMutate).toHaveBeenCalled());
    expect(updateEventMutate.mock.calls.at(-1)![0].payload.allowedStreamIds).toEqual([VIP]);
  });

  describe('stage scoping on update', () => {
    const MAIN = '33333333-3333-4333-8333-333333333333';
    const VIP = '22222222-2222-4222-8222-222222222222';
    const PALCO = '11111111-1111-4111-8111-111111111111';
    const BACK = '44444444-4444-4444-8444-444444444444';
    const stage = (id: string, streamId: string, name: string) => ({ ...STAGES[0], id, streamId, name });
    const ticket = (allowedStageIds: string[], allowedStreamIds: string[]) => ({
      id: 't1',
      name: 'VIP',
      description: 'Acesso VIP',
      price: 10,
      currency: 'BRL',
      capabilities: ['LIVE_VIEW' as const],
      camerasLimit: null,
      allowedStageIds,
      allowedStreamIds,
      capacity: null,
      immutable: false,
    });
    const save = async (t: ReturnType<typeof ticket>) => {
      useEventStagesQueryMock.mockReturnValue({
        stages: [stage(PALCO, MAIN, 'Palco'), stage(BACK, VIP, 'Back')],
        isLoading: false,
      });
      render(<EditTicketSection eventId="evt-1" tickets={[t]} />);
      fireEvent.click(screen.getByLabelText('edit'));
      return t;
    };
    const savedPayload = async () => {
      fireEvent.click(screen.getByText('save'));
      await waitFor(() => expect(updateEventMutate).toHaveBeenCalled());
      return updateEventMutate.mock.calls.at(-1)![0].payload;
    };

    it('prunes stage picks outside the ticket transmissions', async () => {
      await save(ticket([PALCO, BACK], [VIP]));
      expect((await savedPayload()).allowedStageIds).toEqual([BACK]);
    });

    it('sends [] when pruning leaves no stage, so the old restriction is cleared', async () => {
      await save(ticket([PALCO], [VIP]));
      expect((await savedPayload()).allowedStageIds).toEqual([]);
    });

    it('sends [] when every stage is unchecked', async () => {
      await save(ticket([PALCO], []));
      fireEvent.click(screen.getByText('Palco'));
      expect((await savedPayload()).allowedStageIds).toEqual([]);
    });
  });
});

describe('EditTicketSection — transmissions', () => {
  const MAIN = '33333333-3333-4333-8333-333333333333';
  const VIP = '44444444-4444-4444-8444-444444444444';
  const PALCO = '55555555-5555-4555-8555-555555555555';
  const BACK = '66666666-6666-4666-8666-666666666666';
  const stage = (id: string, streamId: string, name: string) => ({
    id, streamId, name, slug: name, position: 0, createdAt: '2026-01-01', updatedAt: '2026-01-01',
  });
  const stream = (id: string, title: string, position: number) => ({
    id, eventId: 'evt-1', programId: null, title, status: 'READY', position, createdAt: '2026-01-01', updatedAt: '2026-01-01',
  });

  beforeEach(() => {
    vi.clearAllMocks();
    useEventStreamsQueryMock.mockReturnValue({ data: [stream(MAIN, 'Principal', 0), stream(VIP, 'VIP', 1)], isLoading: false });
    useEventStagesQueryMock.mockReturnValue({ stages: [stage(PALCO, MAIN, 'Palco'), stage(BACK, VIP, 'Backstage')], isLoading: false });
  });

  it('hides the transmission picker when the event has a single transmission', () => {
    useEventStreamsQueryMock.mockReturnValue({ data: [stream(MAIN, 'Principal', 0)], isLoading: false });
    render(<EditTicketSection eventId="evt-1" tickets={[]} />);
    fireEvent.click(screen.getByLabelText('liveView'));
    expect(screen.queryByText('streamsLabel')).toBeNull();
    expect(screen.getByLabelText('Palco')).toBeTruthy();
  });

  it('selecting a transmission narrows the stages, prunes stale picks and is sent on submit', async () => {
    render(<EditTicketSection eventId="evt-1" tickets={[]} />);
    fillRequiredFields();
    fireEvent.click(screen.getByLabelText('Palco'));

    fireEvent.click(screen.getByLabelText('VIP'));

    expect(screen.queryByLabelText('Palco')).toBeNull();
    expect(screen.getByLabelText('Backstage')).toBeTruthy();
    fireEvent.click(screen.getByText('add'));
    await waitFor(() => expect(createEventMutate).toHaveBeenCalled());
    const payload = createEventMutate.mock.calls.at(-1)![0];
    expect(payload.allowedStreamIds).toEqual([VIP]);
    expect(payload.allowedStageIds).toBeUndefined();
  });
});
