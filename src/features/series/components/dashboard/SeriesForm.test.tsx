import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { SeriesResponse } from '../../types/series.types';
import { SeriesForm } from './SeriesForm';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'pt-BR',
}));

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('@/features/organizations/queries/get-my-organizations', () => ({
  useMyOrganizationsQuery: () => ({
    data: [
      { id: 'org-1', name: 'Org Um', slug: 'org-um' },
      { id: 'org-2', name: 'Org Dois', slug: 'org-dois' },
    ],
  }),
}));

const createMutate = vi.fn();
const updateMutate = vi.fn();
vi.mock('../../mutations/series.mutations', () => ({
  useCreateSeriesMutation: () => ({ mutate: createMutate, isPending: false }),
  useUpdateSeriesMutation: () => ({ mutate: updateMutate, isPending: false }),
}));

const series = (overrides: Partial<SeriesResponse> = {}): SeriesResponse => ({
  id: 'series-1',
  organizationId: 'org-1',
  slug: 'quinta-do-rock',
  name: 'Quinta do Rock',
  description: null,
  rrule: 'FREQ=WEEKLY;BYDAY=TH',
  dtstart: '2026-01-01T23:00:00.000Z',
  timezone: 'America/Sao_Paulo',
  durationMin: 90,
  horizonWeeks: 4,
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

// Os labels obrigatórios carregam um "*" colado ao texto (mesmo padrão do
// CreateChannelForm) — casa só o prefixo em vez do texto inteiro.
const label = (key: string) => new RegExp(`^${key}`);

const type = (labelKey: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label(labelKey)), { target: { value } });

// A ordem dos botões (todos com aria-pressed) é MO..SU, a mesma do RRULE —
// filtra por esse atributo em vez do texto (que é um nome de dia localizado).
const dayButtons = () =>
  screen.getAllByRole('button').filter((button) => button.hasAttribute('aria-pressed'));

const fill = () => {
  type('nameLabel', 'Quinta do Rock');
  type('firstDateLabel', '2026-09-03');
  type('startLabel', '20:00');
  type('timezoneLabel', 'America/Sao_Paulo');
  fireEvent.click(dayButtons()[3]); // TH
};

describe('SeriesForm — create', () => {
  beforeEach(() => {
    createMutate.mockReset();
    updateMutate.mockReset();
    push.mockReset();
  });

  it('composes the rrule from the picked weekdays and the dtstart from the wall clock in the chosen timezone', () => {
    render(<SeriesForm />);
    fill();

    fireEvent.click(screen.getByText('submit'));

    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        name: 'Quinta do Rock',
        rrule: 'FREQ=WEEKLY;BYDAY=TH',
        dtstart: '2026-09-03T23:00:00.000Z',
        timezone: 'America/Sao_Paulo',
      }),
      expect.anything(),
    );
  });

  it('derives the slug from the name until the slug is edited by hand', () => {
    render(<SeriesForm />);

    type('nameLabel', 'Quinta do Rock!');
    expect(screen.getByLabelText(label('slugLabel'))).toHaveValue('quinta-do-rock');

    type('slugLabel', 'meu-programa');
    type('nameLabel', 'Outro nome');
    expect(screen.getByLabelText(label('slugLabel'))).toHaveValue('meu-programa');
  });

  it('does not submit an incomplete form', () => {
    render(<SeriesForm />);

    expect(screen.getByText('submit')).toBeDisabled();
    expect(createMutate).not.toHaveBeenCalled();
  });

  it('does not submit without at least one weekday picked', () => {
    render(<SeriesForm />);
    type('nameLabel', 'Quinta do Rock');
    type('firstDateLabel', '2026-09-03');
    type('startLabel', '20:00');
    type('timezoneLabel', 'America/Sao_Paulo');

    expect(screen.getByText('submit')).toBeDisabled();
  });

  it('picks Seg-Sex and Todos from the weekday quick picks', () => {
    render(<SeriesForm />);

    fireEvent.click(screen.getByText('presetWeekdays'));
    expect(dayButtons().filter((b) => b.getAttribute('aria-pressed') === 'true')).toHaveLength(5);

    fireEvent.click(screen.getByText('presetAllDays'));
    expect(dayButtons().filter((b) => b.getAttribute('aria-pressed') === 'true')).toHaveLength(7);
  });

  it('sets the duration from a preset pill', () => {
    render(<SeriesForm />);

    fireEvent.click(screen.getByText('durationPreset90'));

    expect(screen.getByLabelText(label('durationLabel'))).toHaveValue(90);
  });

  it('constrains the episode duration natively and refuses a duration over 1440 minutes', () => {
    render(<SeriesForm />);
    fill();

    expect(screen.getByLabelText(label('durationLabel'))).toHaveAttribute('max', '1440');

    fireEvent.change(screen.getByLabelText(label('durationLabel')), { target: { value: '1500' } });

    expect(screen.getByText('submit')).toBeDisabled();
  });

  it('builds the summary from time, weekdays, first date and horizon', () => {
    render(<SeriesForm />);
    fill();

    expect(
      screen.getByText('20:00–21:00 · qui. · summaryFrom · summaryHorizon'),
    ).toBeInTheDocument();
  });

  it('shows the summary placeholder until the window is valid', () => {
    render(<SeriesForm />);

    expect(screen.getByText('summaryPlaceholder')).toBeInTheDocument();
  });

  it('goes to the new series once it is created', () => {
    createMutate.mockImplementation((_input, options) =>
      options.onSuccess({ id: 'series-1', slug: 'quinta-do-rock' }),
    );

    render(<SeriesForm />);
    fill();
    fireEvent.click(screen.getByText('submit'));

    expect(push).toHaveBeenCalledWith('/dashboard/series/quinta-do-rock');
  });

  it('does not submit with a timezone that is not a real IANA zone', () => {
    render(<SeriesForm />);
    type('nameLabel', 'Quinta do Rock');
    type('firstDateLabel', '2026-09-03');
    type('startLabel', '20:00');
    fireEvent.change(screen.getByLabelText(label('timezoneLabel')), {
      target: { value: 'Not/AZone' },
    });
    fireEvent.click(dayButtons()[3]);

    expect(screen.getByText('submit')).toBeDisabled();
    fireEvent.click(screen.getByText('submit'));
    expect(createMutate).not.toHaveBeenCalled();
  });

  it('defaults the horizon to 4 weeks and the duration to 60 minutes', () => {
    render(<SeriesForm />);
    fill();

    fireEvent.click(screen.getByText('submit'));

    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({ horizonWeeks: 4, durationMin: 60 }),
      expect.anything(),
    );
  });

  it('creates under the picked organization when there is more than one', () => {
    render(<SeriesForm />);
    fill();
    fireEvent.change(screen.getByLabelText(label('organizationLabel')), { target: { value: 'org-2' } });

    fireEvent.click(screen.getByText('submit'));

    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'org-2' }),
      expect.anything(),
    );
  });

  it('lists the next steps so the template is not mistaken for a ready series', () => {
    render(<SeriesForm />);

    expect(screen.getByText('camerasTitle')).toBeInTheDocument();
    expect(screen.getByText('lifecycle')).toBeInTheDocument();
  });
});

describe('SeriesForm — edit', () => {
  beforeEach(() => {
    createMutate.mockReset();
    updateMutate.mockReset();
  });

  it('prefills the form from the series, in its own timezone, and hides the slug', () => {
    render(<SeriesForm mode="edit" initial={series()} />);

    expect(screen.getByLabelText(label('nameLabel'))).toHaveValue('Quinta do Rock');
    expect(screen.queryByLabelText(label('slugLabel'))).toBeNull();
    expect(screen.getByLabelText(label('firstDateLabel'))).toHaveValue('2026-01-01');
    expect(screen.getByLabelText(label('startLabel'))).toHaveValue('20:00');
    expect(dayButtons()[3]).toHaveAttribute('aria-pressed', 'true');
  });

  it('does not render the page shell (breadcrumb/aside) inside the edit dialog', () => {
    render(<SeriesForm mode="edit" initial={series()} />);

    expect(screen.queryByText('breadcrumbCurrent')).toBeNull();
    expect(screen.queryByText('camerasTitle')).toBeNull();
  });

  it('updates the series with the changed fields', () => {
    render(<SeriesForm mode="edit" initial={series()} />);

    type('nameLabel', 'Sexta do Rock');
    fireEvent.click(dayButtons()[4]); // FR

    fireEvent.click(screen.getByText('save'));

    expect(updateMutate).toHaveBeenCalledWith(
      {
        id: 'series-1',
        organizationId: 'org-1',
        slug: 'quinta-do-rock',
        input: expect.objectContaining({
          name: 'Sexta do Rock',
          rrule: 'FREQ=WEEKLY;BYDAY=TH,FR',
        }),
      },
      expect.anything(),
    );
    expect(createMutate).not.toHaveBeenCalled();
  });
});
