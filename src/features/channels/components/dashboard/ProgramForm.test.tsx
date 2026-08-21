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

const onDone = vi.fn();

const renderForm = () => render(<ProgramForm channelId="ch-1" slug="canal-um" onDone={onDone} />);

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

  it('closes itself once the program is saved', () => {
    mutate.mockImplementation((_args, options) => options.onSuccess());

    renderForm();
    fillBase();
    checkDays(0);
    fireEvent.click(screen.getByText('dashboard.save'));

    expect(onDone).toHaveBeenCalled();
  });
});
