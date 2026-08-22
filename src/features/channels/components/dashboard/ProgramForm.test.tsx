import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProgramForm } from './ProgramForm';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'pt-BR',
}));

const mutate = vi.fn();
vi.mock('../../mutations/channel.mutations', () => ({
  useUpsertProgramMutation: () => ({ mutate, isPending: false }),
}));

const myEvents: Array<{
  id: string;
  title: string;
  organizationId: string;
  format: string;
  status: string;
  startsAt: string;
  endsAt: string;
}> = [];
vi.mock('@/features/events', () => ({
  useMyEventsQuery: () => ({ data: myEvents }),
}));

const onDone = vi.fn();

const renderForm = (timezone = 'America/Sao_Paulo') =>
  render(
    <ProgramForm
      channelId="ch-1"
      slug="canal-um"
      organizationId="org-1"
      timezone={timezone}
      onDone={onDone}
    />,
  );

const fillBase = () => {
  fireEvent.change(screen.getByLabelText('dashboard.programName'), {
    target: { value: 'Jornal da Meia-Noite' },
  });
  fireEvent.change(screen.getByLabelText('dashboard.startTime'), { target: { value: '21:30' } });
  fireEvent.change(screen.getByLabelText('dashboard.duration'), { target: { value: '60' } });
};

// A ordem das checkboxes é MO..SU, a mesma do RRULE.
const checkDays = (...indexes: number[]) => {
  const boxes = screen.getAllByRole('checkbox');
  indexes.forEach((index) => fireEvent.click(boxes[index]));
};

describe('ProgramForm', () => {
  beforeEach(() => {
    mutate.mockReset();
    onDone.mockReset();
    myEvents.length = 0;
  });

  it('submits the program with the weekdays composed into an RRULE', () => {
    renderForm();
    fillBase();
    checkDays(0, 2);

    fireEvent.click(screen.getByText('dashboard.save'));

    expect(mutate).toHaveBeenCalledWith(
      {
        input: {
          name: 'Jornal da Meia-Noite',
          description: undefined,
          startTime: '21:30',
          durationMin: 60,
          rrule: 'FREQ=WEEKLY;BYDAY=MO,WE',
          eventId: null,
        },
        slug: 'canal-um',
      },
      expect.anything(),
    );
  });

  it('collapses every weekday into a daily rule', () => {
    renderForm();
    fillBase();
    checkDays(0, 1, 2, 3, 4, 5, 6);

    fireEvent.click(screen.getByText('dashboard.save'));

    expect(mutate.mock.calls[0][0].input.rrule).toBe('FREQ=DAILY');
  });

  it('never shows the raw RRULE', () => {
    renderForm();
    checkDays(0);

    expect(screen.queryByDisplayValue(/FREQ=/)).toBeNull();
    expect(screen.queryByText(/FREQ=/)).toBeNull();
  });

  it('does not submit without a weekday', () => {
    renderForm();
    fillBase();

    fireEvent.click(screen.getByText('dashboard.save'));

    expect(mutate).not.toHaveBeenCalled();
  });

  // Espelha @Min(5)/@Max(1440) do UpsertProgramDto.
  it.each(['4', '1441'])('does not submit a duration of %s minutes', (durationMin) => {
    renderForm();
    fillBase();
    checkDays(0);
    fireEvent.change(screen.getByLabelText('dashboard.duration'), {
      target: { value: durationMin },
    });

    fireEvent.click(screen.getByText('dashboard.save'));

    expect(mutate).not.toHaveBeenCalled();
  });

  it('accepts the duration bounds themselves', () => {
    renderForm();
    fillBase();
    checkDays(0);
    fireEvent.change(screen.getByLabelText('dashboard.duration'), { target: { value: '5' } });

    fireEvent.click(screen.getByText('dashboard.save'));

    expect(mutate.mock.calls[0][0].input.durationMin).toBe(5);
  });

  it('closes itself once the program is saved', () => {
    mutate.mockImplementation((_args, options) => options.onSuccess());

    renderForm();
    fillBase();
    checkDays(0);
    fireEvent.click(screen.getByText('dashboard.save'));

    expect(onDone).toHaveBeenCalled();
  });

  describe('event link', () => {
    // Segunda 2024-01-01 21:00-22:00 UTC-3 (America/Sao_Paulo) cai dentro da
    // janela do programa (segunda, 21:30, 60min).
    const overlappingEvent = {
      id: 'evt-1',
      title: 'Jogo Final',
      organizationId: 'org-1',
      format: 'LIVE',
      status: 'SCHEDULED',
      startsAt: '2024-01-01T23:45:00.000Z',
      endsAt: '2024-01-02T00:45:00.000Z',
    };
    const nonOverlappingEvent = {
      id: 'evt-2',
      title: 'Show da Tarde',
      organizationId: 'org-1',
      format: 'LIVE',
      status: 'SCHEDULED',
      startsAt: '2024-01-01T15:00:00.000Z',
      endsAt: '2024-01-01T16:00:00.000Z',
    };

    it('sends the selected eventId in the program payload', () => {
      myEvents.push(overlappingEvent);
      renderForm();
      fillBase();
      checkDays(0);
      fireEvent.change(screen.getByLabelText('dashboard.linkToEvent'), {
        target: { value: 'evt-1' },
      });

      fireEvent.click(screen.getByText('dashboard.save'));

      expect(mutate.mock.calls[0][0].input.eventId).toBe('evt-1');
    });

    it('warns when the linked event does not overlap the program window', () => {
      myEvents.push(nonOverlappingEvent);
      renderForm();
      checkDays(0); // Monday
      fireEvent.change(screen.getByLabelText('dashboard.startTime'), {
        target: { value: '21:30' },
      });

      fireEvent.change(screen.getByLabelText('dashboard.linkToEvent'), {
        target: { value: 'evt-2' },
      });

      expect(screen.getByText('dashboard.linkToEventOverlapWarning')).toBeInTheDocument();
    });

    it('does not warn when the linked event overlaps the program window', () => {
      myEvents.push(overlappingEvent);
      renderForm();
      checkDays(0); // Monday
      fireEvent.change(screen.getByLabelText('dashboard.startTime'), {
        target: { value: '21:30' },
      });

      fireEvent.change(screen.getByLabelText('dashboard.linkToEvent'), {
        target: { value: 'evt-1' },
      });

      expect(screen.queryByText('dashboard.linkToEventOverlapWarning')).toBeNull();
    });

    it('does not warn without a linked event', () => {
      myEvents.push(nonOverlappingEvent);
      renderForm();
      checkDays(0);

      expect(screen.queryByText('dashboard.linkToEventOverlapWarning')).toBeNull();
    });

    it('only lists events from the same org, LIVE format and SCHEDULED/LIVE status', () => {
      myEvents.push(
        overlappingEvent,
        { ...nonOverlappingEvent, id: 'evt-3', organizationId: 'org-2' },
        { ...nonOverlappingEvent, id: 'evt-4', format: 'VOD' },
        { ...nonOverlappingEvent, id: 'evt-5', status: 'FINISHED' },
      );
      renderForm();

      const options = screen
        .getAllByRole('option')
        .map((option) => (option as HTMLOptionElement).value);
      expect(options).toEqual(['', 'evt-1']);
    });
  });
});
