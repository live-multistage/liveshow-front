import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProgramModal } from './ProgramModal';
import type { Program } from '../../types/channel.types';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'pt-BR',
}));

const upsertMutate = vi.fn();
const deleteMutate = vi.fn();
vi.mock('../../mutations/channel.mutations', () => ({
  useUpsertProgramMutation: () => ({ mutate: upsertMutate, isPending: false }),
  useDeleteProgramMutation: () => ({ mutate: deleteMutate, isPending: false }),
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
const onOpenChange = vi.fn();

const renderModal = (program?: Program, timezone = 'America/Sao_Paulo') =>
  render(
    <ProgramModal
      open
      onOpenChange={onOpenChange}
      channelId="ch-1"
      slug="canal-um"
      organizationId="org-1"
      channelName="Canal Um"
      timezone={timezone}
      program={program}
      onDone={onDone}
    />,
  );

const fillBase = () => {
  fireEvent.change(screen.getByLabelText('name'), {
    target: { value: 'Jornal da Meia-Noite' },
  });
  fireEvent.change(screen.getByLabelText('start'), { target: { value: '21:30' } });
  fireEvent.change(screen.getByLabelText('duration'), { target: { value: '60' } });
};

// A ordem dos botões (todos com aria-pressed) é MO..SU, a mesma do RRULE.
// Filtrar por esse atributo em vez do valor evita que um dia já marcado
// deslize de posição quando o índice é reutilizado num segundo clique.
const dayButtons = () =>
  screen.getAllByRole('button').filter((button) => button.hasAttribute('aria-pressed'));

const clickDays = (...indexes: number[]) => {
  const buttons = dayButtons();
  indexes.forEach((index) => fireEvent.click(buttons[index]));
};

describe('ProgramModal', () => {
  beforeEach(() => {
    upsertMutate.mockReset();
    deleteMutate.mockReset();
    onDone.mockReset();
    onOpenChange.mockReset();
    myEvents.length = 0;
  });

  it('submits the program with the weekdays composed into an RRULE', () => {
    renderModal();
    fillBase();
    clickDays(0, 2);

    fireEvent.click(screen.getByText('save'));

    expect(upsertMutate).toHaveBeenCalledWith(
      {
        input: {
          name: 'Jornal da Meia-Noite',
          description: undefined,
          startTime: '21:30',
          durationMin: 60,
          rrule: 'FREQ=WEEKLY;BYDAY=MO,WE',
          eventId: null,
        },
        programId: undefined,
        slug: 'canal-um',
      },
      expect.anything(),
    );
  });

  it('does not submit without a weekday', () => {
    renderModal();
    fillBase();

    fireEvent.click(screen.getByText('save'));

    expect(upsertMutate).not.toHaveBeenCalled();
  });

  it('shows the weekday error only after a day is touched', () => {
    renderModal();
    expect(screen.queryByText('weekdaysError')).toBeNull();

    clickDays(0);
    clickDays(0); // desmarca de novo -> nenhum dia selecionado

    expect(screen.getByText('weekdaysError')).toBeInTheDocument();
  });

  it.each(['4', '1441'])('does not submit a duration of %s minutes', (durationMin) => {
    renderModal();
    fillBase();
    clickDays(0);
    fireEvent.change(screen.getByLabelText('duration'), { target: { value: durationMin } });

    fireEvent.click(screen.getByText('save'));

    expect(upsertMutate).not.toHaveBeenCalled();
    expect(screen.getByText('durationError')).toBeInTheDocument();
  });

  it('sets the duration from a preset pill', () => {
    renderModal();

    fireEvent.click(screen.getByText('durationPreset90'));

    expect(screen.getByLabelText('duration')).toHaveValue(90);
  });

  it('picks Mon–Fri from the quick weekday link', () => {
    renderModal();
    fillBase();

    fireEvent.click(screen.getByText('presetWeekdays'));
    fireEvent.click(screen.getByText('save'));

    expect(upsertMutate.mock.calls[0][0].input.rrule).toBe('FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR');
  });

  it('collapses "todos" into a daily rule', () => {
    renderModal();
    fillBase();

    fireEvent.click(screen.getByText('presetAllDays'));
    fireEvent.click(screen.getByText('save'));

    expect(upsertMutate.mock.calls[0][0].input.rrule).toBe('FREQ=DAILY');
  });

  it('builds the summary text and wraps the end time past midnight', () => {
    renderModal();
    fireEvent.change(screen.getByLabelText('start'), { target: { value: '23:30' } });
    fireEvent.change(screen.getByLabelText('duration'), { target: { value: '90' } });
    clickDays(0);

    expect(screen.getByText('23:30–01:00 · seg.')).toBeInTheDocument();
  });

  it('shows the summary placeholder until the window is valid', () => {
    renderModal();

    expect(screen.getByText('summaryPlaceholder')).toBeInTheDocument();
  });

  it('gates submit until name, start, duration and a weekday are all valid', () => {
    renderModal();
    expect(screen.getByText('save')).toBeDisabled();

    fillBase();
    expect(screen.getByText('save')).toBeDisabled();

    clickDays(0);
    expect(screen.getByText('save')).toBeEnabled();
  });

  describe('edit mode', () => {
    const editingProgram: Program = {
      id: 'prg-1',
      channelId: 'ch-1',
      name: 'Jornal',
      description: null,
      startTime: '20:00:00',
      durationMin: 90,
      rrule: 'FREQ=WEEKLY;BYDAY=MO,WE',
      eventId: null,
    };

    it('prefills every field from the program', () => {
      renderModal(editingProgram);

      expect(screen.getByLabelText('name')).toHaveValue('Jornal');
      expect(screen.getByLabelText('start')).toHaveValue('20:00');
      expect(screen.getByLabelText('duration')).toHaveValue(90);
      expect(screen.getByText('editTitle')).toBeInTheDocument();
    });

    it('sends the programId on submit', () => {
      renderModal(editingProgram);

      fireEvent.click(screen.getByText('save'));

      expect(upsertMutate.mock.calls[0][0].programId).toBe('prg-1');
    });

    it('deletes only after a second click confirms it', () => {
      renderModal(editingProgram);

      fireEvent.click(screen.getByText('delete'));
      expect(deleteMutate).not.toHaveBeenCalled();

      fireEvent.click(screen.getByText('deleteConfirm'));

      expect(deleteMutate).toHaveBeenCalledWith(
        { programId: 'prg-1', slug: 'canal-um' },
        expect.anything(),
      );
    });

    it('does not show the delete link when creating a new program', () => {
      renderModal();

      expect(screen.queryByText('delete')).toBeNull();
    });
  });

  describe('event link', () => {
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
      renderModal();
      fillBase();
      clickDays(0);
      fireEvent.change(screen.getByLabelText('linkToEvent'), { target: { value: 'evt-1' } });

      fireEvent.click(screen.getByText('save'));

      expect(upsertMutate.mock.calls[0][0].input.eventId).toBe('evt-1');
    });

    it('warns when the linked event does not overlap the program window', () => {
      myEvents.push(nonOverlappingEvent);
      renderModal();
      clickDays(0); // Monday
      fireEvent.change(screen.getByLabelText('start'), { target: { value: '21:30' } });

      fireEvent.change(screen.getByLabelText('linkToEvent'), { target: { value: 'evt-2' } });

      expect(screen.getByText('linkToEventOverlapWarning')).toBeInTheDocument();
    });

    it('does not warn when the linked event overlaps the program window', () => {
      myEvents.push(overlappingEvent);
      renderModal();
      clickDays(0); // Monday
      fireEvent.change(screen.getByLabelText('start'), { target: { value: '21:30' } });

      fireEvent.change(screen.getByLabelText('linkToEvent'), { target: { value: 'evt-1' } });

      expect(screen.queryByText('linkToEventOverlapWarning')).toBeNull();
    });
  });
});
