import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import type { ScheduledSlot } from '../types/channel.types';
import { OffAirOverlay } from './OffAirOverlay';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'pt-BR',
}));

const next: ScheduledSlot = {
  programId: 'prg-1',
  name: 'Jornal da Meia-Noite',
  // 21:30 in São Paulo, spelled with an explicit offset so the test does not
  // depend on the runner's timezone.
  startsAt: '2026-08-21T21:30:00-03:00',
  endsAt: '2026-08-21T22:30:00-03:00',
};

describe('OffAirOverlay', () => {
  it('says the channel is off air', () => {
    const { getByText } = render(<OffAirOverlay next={null} />);

    expect(getByText('channels.offAir')).toBeInTheDocument();
  });

  it('announces when it comes back, with the next slot time and name', () => {
    const { getByText } = render(<OffAirOverlay next={next} />);

    const time = new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(next.startsAt));

    expect(getByText('channels.backAt')).toBeInTheDocument();
    expect(getByText(time)).toBeInTheDocument();
    expect(getByText('Jornal da Meia-Noite')).toBeInTheDocument();
  });

  it('omits the return line when nothing is scheduled next', () => {
    const { queryByText } = render(<OffAirOverlay next={null} />);

    expect(queryByText('channels.backAt')).toBeNull();
  });
});
