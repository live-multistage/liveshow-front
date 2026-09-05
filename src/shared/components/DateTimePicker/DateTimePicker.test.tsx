import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DateTimePicker } from './DateTimePicker';

const PT_STRINGS: Record<string, string> = {
  invalidDate: 'Data inválida. Use dd/mm/aaaa.',
  invalidTime: 'Hora inválida. Use hh:mm (24h).',
  datePlaceholder: 'dd/mm/aaaa',
  timePlaceholder: 'hh:mm',
  hint: 'DD/MM/AAAA · HH:MM',
  openCalendar: 'Abrir calendário',
  time: 'HORA',
  today: 'Hoje',
  done: 'Pronto',
};

vi.mock('next-intl', () => {
  const t = (key: string) => PT_STRINGS[key] ?? key;
  t.raw = (key: string) => (key === 'weekdays' ? ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] : PT_STRINGS[key]);
  return {
    useTranslations: () => t,
    useLocale: () => 'pt',
  };
});

function getDateInput() {
  return screen.getByPlaceholderText('dd/mm/aaaa') as HTMLInputElement;
}

function getFieldTimeInput() {
  return screen.getAllByPlaceholderText('hh:mm')[0] as HTMLInputElement;
}

describe('DateTimePicker', () => {
  it('masks digits into dd/mm/yyyy as they are typed', () => {
    render(<DateTimePicker value="" onChange={vi.fn()} />);
    fireEvent.change(getDateInput(), { target: { value: '21092026' } });
    expect(getDateInput().value).toBe('21/09/2026');
  });

  it('shows the invalid-date message on blur and does not call onChange', () => {
    const onChange = vi.fn();
    render(<DateTimePicker value="" onChange={onChange} />);
    fireEvent.change(getDateInput(), { target: { value: '31022026' } });
    fireEvent.blur(getDateInput());
    expect(screen.getByText('Data inválida. Use dd/mm/aaaa.')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('emits the combined datetime-local value once both date and time are valid', () => {
    const onChange = vi.fn();
    render(<DateTimePicker value="" onChange={onChange} />);
    fireEvent.change(getDateInput(), { target: { value: '21092026' } });
    fireEvent.blur(getDateInput());
    fireEvent.change(getFieldTimeInput(), { target: { value: '2000' } });
    fireEvent.blur(getFieldTimeInput());
    expect(onChange).toHaveBeenLastCalledWith('2026-09-21T20:00');
  });

  it('picking a day with no time set applies the default time', () => {
    const onChange = vi.fn();
    render(<DateTimePicker value="" onChange={onChange} defaultTime="20:00" />);
    fireEvent.click(screen.getByLabelText('Abrir calendário'));
    fireEvent.click(screen.getByRole('button', { name: '15' }));
    expect(onChange).toHaveBeenCalled();
    const [value] = onChange.mock.calls[onChange.mock.calls.length - 1];
    expect(value).toMatch(/T20:00$/);
  });

  it('clicking a quick-time pill updates the time input', () => {
    const onChange = vi.fn();
    render(<DateTimePicker value="2026-09-21T00:00" onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Abrir calendário'));
    fireEvent.click(screen.getByRole('button', { name: '21:00' }));
    expect(getFieldTimeInput().value).toBe('21:00');
  });

  it('renders the masked date, time and summary from the value prop', () => {
    render(<DateTimePicker value="2026-09-21T19:30" onChange={vi.fn()} />);
    expect(getDateInput().value).toBe('21/09/2026');
    expect(getFieldTimeInput().value).toBe('19:30');
    expect(screen.getByText(/19:30/)).toBeInTheDocument();
  });

  it('disables calendar days before min', () => {
    render(<DateTimePicker value="2026-09-21T00:00" onChange={vi.fn()} min="2026-09-10T00:00" />);
    fireEvent.click(screen.getByLabelText('Abrir calendário'));
    expect(screen.getByRole('button', { name: '5' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '15' })).not.toBeDisabled();
  });
});
