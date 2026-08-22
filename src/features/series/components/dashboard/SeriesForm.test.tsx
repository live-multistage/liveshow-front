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
  templateEventId: 'evt-template-1',
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

const fill = () => {
  type('dashboard.name', 'Quinta do Rock');
  type('dashboard.firstDate', '2026-09-03');
  type('dashboard.startTime', '20:00');
  type('dashboard.timezone', 'America/Sao_Paulo');
  fireEvent.click(screen.getByLabelText('dashboard.weekdayTH'));
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

    fireEvent.click(screen.getByText('dashboard.save'));

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

    type('dashboard.name', 'Quinta do Rock!');
    expect(screen.getByLabelText('dashboard.slug')).toHaveValue('quinta-do-rock');
  });

  it('does not submit an incomplete form', () => {
    render(<SeriesForm />);

    fireEvent.click(screen.getByText('dashboard.save'));

    expect(createMutate).not.toHaveBeenCalled();
  });

  it('does not submit without at least one weekday picked', () => {
    render(<SeriesForm />);
    type('dashboard.name', 'Quinta do Rock');
    type('dashboard.firstDate', '2026-09-03');
    type('dashboard.startTime', '20:00');
    type('dashboard.timezone', 'America/Sao_Paulo');

    fireEvent.click(screen.getByText('dashboard.save'));

    expect(createMutate).not.toHaveBeenCalled();
  });

  it('constrains the episode duration natively and refuses a duration over 1440 minutes', () => {
    render(<SeriesForm />);
    fill();

    expect(screen.getByLabelText('dashboard.duration')).toHaveAttribute('max', '1440');

    fireEvent.change(screen.getByLabelText('dashboard.duration'), { target: { value: '1500' } });
    fireEvent.click(screen.getByText('dashboard.save'));

    expect(createMutate).not.toHaveBeenCalled();
  });

  it('goes to the new series once it is created', () => {
    createMutate.mockImplementation((_input, options) =>
      options.onSuccess({ id: 'series-1', slug: 'quinta-do-rock' }),
    );

    render(<SeriesForm />);
    fill();
    fireEvent.click(screen.getByText('dashboard.save'));

    expect(push).toHaveBeenCalledWith('/dashboard/series/quinta-do-rock');
  });

  it('does not submit with a timezone that is not a real IANA zone', () => {
    render(<SeriesForm />);
    type('dashboard.name', 'Quinta do Rock');
    type('dashboard.firstDate', '2026-09-03');
    type('dashboard.startTime', '20:00');
    type('dashboard.timezone', 'Not/AZone');
    fireEvent.click(screen.getByLabelText('dashboard.weekdayTH'));

    fireEvent.click(screen.getByText('dashboard.save'));

    expect(createMutate).not.toHaveBeenCalled();
  });

  it('defaults the horizon to 4 weeks and the duration to 60 minutes', () => {
    render(<SeriesForm />);
    fill();

    fireEvent.click(screen.getByText('dashboard.save'));

    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({ horizonWeeks: 4, durationMin: 60 }),
      expect.anything(),
    );
  });
});

describe('SeriesForm — edit', () => {
  beforeEach(() => {
    createMutate.mockReset();
    updateMutate.mockReset();
  });

  it('prefills the form from the series, in its own timezone, and freezes the slug', () => {
    render(<SeriesForm mode="edit" initial={series()} />);

    expect(screen.getByLabelText('dashboard.name')).toHaveValue('Quinta do Rock');
    expect(screen.getByLabelText('dashboard.slug')).toHaveValue('quinta-do-rock');
    expect(screen.getByLabelText('dashboard.slug')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('dashboard.firstDate')).toHaveValue('2026-01-01');
    expect(screen.getByLabelText('dashboard.startTime')).toHaveValue('20:00');
    expect(screen.getByLabelText('dashboard.weekdayTH')).toBeChecked();
  });

  it('updates the series with the changed fields', () => {
    render(<SeriesForm mode="edit" initial={series()} />);

    type('dashboard.name', 'Sexta do Rock');
    fireEvent.click(screen.getByLabelText('dashboard.weekdayFR'));

    fireEvent.click(screen.getByText('dashboard.save'));

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
