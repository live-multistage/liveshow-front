import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Program } from '../../types/channel.types';
import { ROW_HEIGHT } from '../../hooks/useWeekGrid';
import { ProgramWeekGrid } from './ProgramWeekGrid';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
  useLocale: () => 'pt-BR',
}));

const programs: Program[] = [];
vi.mock('../../queries/channel.queries', () => ({
  useChannelProgramsQuery: () => ({ data: programs }),
}));

const deleteMutate = vi.fn();
const upsertMutate = vi.fn();
vi.mock('../../mutations/channel.mutations', () => ({
  useDeleteProgramMutation: () => ({ mutate: deleteMutate, isPending: false }),
  useUpsertProgramMutation: () => ({ mutate: upsertMutate, isPending: false }),
}));

const program = (overrides: Partial<Program> = {}): Program => ({
  id: 'prg-1',
  channelId: 'ch-1',
  name: 'Jornal',
  description: null,
  startTime: '20:00',
  durationMin: 120,
  rrule: 'FREQ=WEEKLY;BYDAY=MO',
  latencyMode: 'STANDARD',
  recordingEnabled: true,
  ...overrides,
});

const renderGrid = (status: 'DRAFT' | 'PUBLISHED' = 'PUBLISHED') =>
  render(
    <ProgramWeekGrid
      channelId="ch-1"
      slug="canal-um"
      organizationId="org-1"
      channelName="Canal Um"
      timezone="America/Sao_Paulo"
      status={status}
    />,
  );

describe('ProgramWeekGrid', () => {
  beforeEach(() => {
    deleteMutate.mockReset();
    upsertMutate.mockReset();
    programs.length = 0;
  });

  it('shows the empty state with no programs in the week', () => {
    renderGrid();

    expect(screen.getByText('emptyTitle')).toBeInTheDocument();
    expect(screen.getByText('emptyCta')).toBeInTheDocument();
  });

  it('places a block from the program start time and duration', () => {
    programs.push(program());

    const { container } = renderGrid();
    const block = container.querySelector('[data-testid="program-block"]') as HTMLElement;

    // Janela abre 19h (uma hora antes do programa) -> 20h fica a uma linha.
    expect(block.style.top).toBe(`${ROW_HEIGHT}px`);
    expect(block.style.height).toBe(`${2 * ROW_HEIGHT - 4}px`);
    expect(screen.getByText('Jornal')).toBeInTheDocument();
    expect(screen.getByText('20h — 22h')).toBeInTheDocument();
  });

  it('renders one block per weekday of the recurrence', () => {
    programs.push(program({ rrule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR' }));

    const { container } = renderGrid();

    expect(container.querySelectorAll('[data-testid="program-block"]')).toHaveLength(3);
  });

  it('opens the program form for editing when a block is clicked', () => {
    programs.push(program());

    renderGrid();
    fireEvent.click(screen.getByText('Jornal'));

    expect(screen.getByText('editTitle')).toBeInTheDocument();
  });

  it('opens an empty program form from the new-program action', () => {
    renderGrid();

    fireEvent.click(screen.getByText('newProgram'));

    // O form aparece sem programa carregado — só os campos vazios.
    expect(screen.getByText('newTitle')).toBeInTheDocument();
  });

  it('deletes a program only after the confirmation dialog', () => {
    programs.push(program());

    renderGrid();
    fireEvent.click(screen.getByLabelText('deleteProgram'));
    expect(deleteMutate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('confirm'));

    expect(deleteMutate).toHaveBeenCalledWith({ programId: 'prg-1', slug: 'canal-um' });
  });

  it('warns that the public schedule only shows up after publishing', () => {
    renderGrid('DRAFT');

    expect(screen.getByText('draftNote')).toBeInTheDocument();
  });

  it('walks to the next week and back', () => {
    renderGrid();
    const subtitle = () => screen.getByText(/^subtitle:/).textContent;
    const initial = subtitle();

    fireEvent.click(screen.getByLabelText('nextWeek'));
    expect(subtitle()).not.toBe(initial);

    fireEvent.click(screen.getByText('thisWeek'));
    expect(subtitle()).toBe(initial);
  });
});
