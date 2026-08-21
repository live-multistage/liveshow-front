import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Program, ScheduledSlot } from '../../types/channel.types';
import { ProgramGridEditor } from './ProgramGridEditor';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'pt-BR',
}));

const scheduleCalls: string[] = [];
const slotsByDay: Record<string, ScheduledSlot[]> = {};
const programs: Program[] = [];

vi.mock('../../queries/channel.queries', () => ({
  useChannelScheduleQuery: (_slug: string, day: string) => {
    scheduleCalls.push(day);
    return { data: slotsByDay[day] ?? [] };
  },
  useChannelProgramsQuery: () => ({ data: programs }),
}));

const deleteMutate = vi.fn();
const upsertMutate = vi.fn();
vi.mock('../../mutations/channel.mutations', () => ({
  useDeleteProgramMutation: () => ({ mutate: deleteMutate, isPending: false }),
  useUpsertProgramMutation: () => ({ mutate: upsertMutate, isPending: false }),
}));

const slot: ScheduledSlot = {
  programId: 'prg-1',
  name: 'Jornal da Meia-Noite',
  startsAt: '2026-08-21T11:00:00Z',
  endsAt: '2026-08-21T12:00:00Z',
};

const program: Program = {
  id: 'prg-1',
  channelId: 'ch-1',
  name: 'Jornal da Meia-Noite',
  description: null,
  startTime: '20:00',
  durationMin: 60,
  rrule: 'FREQ=WEEKLY;BYDAY=MO,WE',
};

const renderGrid = (timezone = 'Asia/Tokyo') =>
  render(
    <ProgramGridEditor channelId="ch-1" slug="canal-um" timezone={timezone} status="PUBLISHED" />,
  );

describe('ProgramGridEditor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 2026-08-21 11:00Z é 2026-08-21 20:00 em Tóquio — o dia civil do canal.
    vi.setSystemTime(new Date('2026-08-21T11:00:00Z'));
    scheduleCalls.length = 0;
    programs.length = 0;
    Object.keys(slotsByDay).forEach((key) => delete slotsByDay[key]);
    deleteMutate.mockReset();
    upsertMutate.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('asks for the seven days that follow today in the channel timezone', () => {
    renderGrid();

    expect(scheduleCalls).toEqual([
      '2026-08-21',
      '2026-08-22',
      '2026-08-23',
      '2026-08-24',
      '2026-08-25',
      '2026-08-26',
      '2026-08-27',
    ]);
  });

  it('starts the week on the channel date, not the browser one', () => {
    // 23:00Z ainda é dia 21 em quase todo fuso do ocidente, mas já é dia 22 em
    // Tóquio — é o fuso do canal que decide.
    vi.setSystemTime(new Date('2026-08-21T23:00:00Z'));

    renderGrid();

    expect(scheduleCalls[0]).toBe('2026-08-22');
  });

  it('renders the slot time in the channel timezone', () => {
    slotsByDay['2026-08-21'] = [slot];

    renderGrid();

    expect(screen.getByText('20:00')).toBeInTheDocument();
    expect(screen.getByText('Jornal da Meia-Noite')).toBeInTheDocument();
  });

  it('warns that a draft channel has no public schedule yet', () => {
    render(
      <ProgramGridEditor channelId="ch-1" slug="canal-um" timezone="Asia/Tokyo" status="DRAFT" />,
    );

    expect(screen.getByText('dashboard.draftScheduleNote')).toBeInTheDocument();
  });

  it('keeps the note out of the way once the channel is published', () => {
    renderGrid();

    expect(screen.queryByText('dashboard.draftScheduleNote')).toBeNull();
  });

  it('asks for confirmation before deleting a recurring program', () => {
    slotsByDay['2026-08-21'] = [slot];
    renderGrid();

    fireEvent.click(screen.getByLabelText('dashboard.delete'));

    expect(screen.getByText('dashboard.deleteProgramTitle')).toBeInTheDocument();
    expect(screen.getByText('dashboard.deleteProgramBody')).toBeInTheDocument();
    expect(deleteMutate).not.toHaveBeenCalled();
  });

  it('deletes the program only after the confirmation', () => {
    slotsByDay['2026-08-21'] = [slot];
    renderGrid();

    fireEvent.click(screen.getByLabelText('dashboard.delete'));
    fireEvent.click(screen.getByText('dashboard.confirm'));

    expect(deleteMutate).toHaveBeenCalledWith({ programId: 'prg-1', slug: 'canal-um' });
  });

  it('drops the deletion when it is cancelled', () => {
    slotsByDay['2026-08-21'] = [slot];
    renderGrid();

    fireEvent.click(screen.getByLabelText('dashboard.delete'));
    fireEvent.click(screen.getByText('dashboard.cancel'));

    expect(deleteMutate).not.toHaveBeenCalled();
  });

  it('opens the program prefilled when a slot is clicked', () => {
    slotsByDay['2026-08-21'] = [slot];
    programs.push(program);
    renderGrid();

    fireEvent.click(screen.getByText('20:00'));

    expect(screen.getByText('dashboard.editProgram')).toBeInTheDocument();
    expect(screen.getByLabelText('dashboard.programName')).toHaveValue('Jornal da Meia-Noite');
    expect(screen.getByLabelText('dashboard.startTime')).toHaveValue('20:00');
    expect(screen.getByLabelText('dashboard.duration')).toHaveValue(60);
    // FREQ=WEEKLY;BYDAY=MO,WE → segunda e quarta marcadas.
    const checked = screen.getAllByRole('checkbox').map((box) => (box as HTMLInputElement).checked);
    expect(checked).toEqual([true, false, true, false, false, false, false]);
  });

  it('saves an edited program against its own id', () => {
    slotsByDay['2026-08-21'] = [slot];
    programs.push(program);
    renderGrid();

    fireEvent.click(screen.getByText('20:00'));
    fireEvent.click(screen.getByText('dashboard.save'));

    expect(upsertMutate).toHaveBeenCalledWith(
      expect.objectContaining({ programId: 'prg-1', slug: 'canal-um' }),
      expect.anything(),
    );
  });
});
