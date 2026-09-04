import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string) => key;
    t.raw = (key: string) => {
      if (key === 'transmission.signals') {
        return [{ name: 'CAM 1' }, { name: 'CAM 2' }, { name: 'CAM 3' }, { name: 'CAM 4' }];
      }
      if (key === 'replay.bullets') {
        return ['Bullet one', 'Bullet two', 'Bullet three'];
      }
      if (key === 'hero.mock.cams') {
        return [{ name: 'Cam A' }, { name: 'Cam B' }, { name: 'Cam C' }, { name: 'Cam D' }];
      }
      return [];
    };
    return t;
  },
}));

import { TransmissionSection } from './TransmissionSection';
import { TicketsSection } from './TicketsSection';
import { ChannelsSection } from './ChannelsSection';
import { ReplaySection } from './ReplaySection';
import { ManagementSection } from './ManagementSection';
import { PaymentSection } from './PaymentSection';

const TRANSMISSION_FEATURES = ['multicam', 'latency', 'audio', 'libras', 'recording', 'health'];
const TICKET_ITEMS = ['digital', 'free', 'physical', 'coupons', 'replay', 'collab'];
const CHANNEL_SLOTS = ['pre', 'round12a', 'roundtable', 'highlights', 'backstage', 'round12b'];
const MANAGEMENT_STATS = ['sold', 'revenue', 'avg', 'watching'];
const MANAGEMENT_FEATURES = ['sales', 'audience', 'reports', 'ledger', 'team', 'ads'];
const PAYMENT_CARDS = ['percent', 'payout', 'cards'];

describe('static organizer sections', () => {
  it('renders 4 signal cells and 6 feature titles', () => {
    render(<TransmissionSection />);
    expect(screen.getAllByText('SRT OK')).toHaveLength(4);
    TRANSMISSION_FEATURES.forEach((key) => {
      expect(screen.getByText(`transmission.features.${key}.title`)).toBeInTheDocument();
    });
  });

  it('renders 6 ticket cards', () => {
    render(<TicketsSection />);
    TICKET_ITEMS.forEach((key) => {
      expect(screen.getByText(`tickets.items.${key}.title`)).toBeInTheDocument();
    });
  });

  it('renders 6 channel slots', () => {
    render(<ChannelsSection />);
    CHANNEL_SLOTS.forEach((key) => {
      expect(screen.getByText(`channels.mock.slots.${key}`)).toBeInTheDocument();
    });
  });

  it('renders 3 replay bullets', () => {
    render(<ReplaySection />);
    ['Bullet one', 'Bullet two', 'Bullet three'].forEach((bullet) => {
      expect(screen.getByText(bullet)).toBeInTheDocument();
    });
  });

  it('renders 4 stats and 6 features', () => {
    render(<ManagementSection />);
    MANAGEMENT_STATS.forEach((key) => {
      expect(screen.getByText(`management.mock.stats.${key}`)).toBeInTheDocument();
    });
    MANAGEMENT_FEATURES.forEach((key) => {
      expect(screen.getByText(`management.features.${key}.title`)).toBeInTheDocument();
    });
  });

  it('renders 3 payment cards and the note', () => {
    render(<PaymentSection />);
    PAYMENT_CARDS.forEach((key) => {
      expect(screen.getByText(`payment.cards.${key}.title`)).toBeInTheDocument();
    });
    expect(screen.getByText('payment.note')).toBeInTheDocument();
  });
});
