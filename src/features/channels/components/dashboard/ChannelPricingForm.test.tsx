import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Channel } from '../../types/channel.types';
import { ChannelPricingForm, emptyPricingValue, type PricingValue } from './ChannelPricingForm';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'pt-BR',
}));

const updateMutate = vi.fn();
vi.mock('../../mutations/channel.mutations', () => ({
  useUpdateChannelMutation: () => ({ mutate: updateMutate, isPending: false }),
}));

const channel = (overrides: Partial<Channel> = {}): Channel =>
  ({
    id: 'ch-1',
    organizationId: 'org-1',
    slug: 'canal-um',
    name: 'Canal Um',
    description: null,
    coverUrl: null,
    accessMode: 'FREE',
    status: 'DRAFT',
    broadcastEventId: 'evt-1',
    timezone: 'America/Sao_Paulo',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  }) as Channel;

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('ChannelPricingForm — standalone', () => {
  beforeEach(() => {
    updateMutate.mockReset();
  });

  const enableSubscription = () => fireEvent.click(screen.getByLabelText(/^accessSubscriptionTitle/));

  it('hides pricing fields for a FREE channel', () => {
    render(<ChannelPricingForm initial={channel()} />);

    expect(screen.queryByLabelText('dashboard.pricing.monthlyPrice')).toBeNull();
  });

  it('shows currency and price fields once SUBSCRIPTION is picked', () => {
    render(<ChannelPricingForm initial={channel()} />);

    enableSubscription();

    expect(screen.getByLabelText('dashboard.pricing.currency')).toBeInTheDocument();
    expect(screen.getByLabelText('dashboard.pricing.monthlyPrice')).toBeInTheDocument();
    expect(screen.getByLabelText('dashboard.pricing.yearlyPrice')).toBeInTheDocument();
  });

  it('prefills the price fields in major units from cents', () => {
    const withPricing = {
      ...channel({ accessMode: 'SUBSCRIPTION' }),
      currency: 'USD',
      monthlyPriceCents: 1990,
      yearlyPriceCents: 19900,
    };

    render(<ChannelPricingForm initial={withPricing} />);

    expect(screen.getByLabelText('dashboard.pricing.currency')).toHaveValue('USD');
    expect(screen.getByLabelText('dashboard.pricing.monthlyPrice')).toHaveValue(19.9);
    expect(screen.getByLabelText('dashboard.pricing.yearlyPrice')).toHaveValue(199);
  });

  it('refuses to submit a SUBSCRIPTION channel with no price set', () => {
    render(<ChannelPricingForm initial={channel()} />);
    enableSubscription();

    fireEvent.click(screen.getByText('dashboard.save'));

    expect(updateMutate).not.toHaveBeenCalled();
  });

  it('refuses a price below the 1,00 minimum', () => {
    render(<ChannelPricingForm initial={channel()} />);
    enableSubscription();
    type('dashboard.pricing.monthlyPrice', '0.50');

    fireEvent.click(screen.getByText('dashboard.save'));

    expect(updateMutate).not.toHaveBeenCalled();
  });

  it('submits with at least one valid price, converted to cents, and the blank interval as null', () => {
    render(<ChannelPricingForm initial={channel()} />);
    enableSubscription();
    type('dashboard.pricing.monthlyPrice', '19.90');

    fireEvent.click(screen.getByText('dashboard.save'));

    expect(updateMutate).toHaveBeenCalledWith(
      {
        id: 'ch-1',
        slug: 'canal-um',
        organizationId: 'org-1',
        input: {
          accessMode: 'SUBSCRIPTION',
          currency: 'BRL',
          monthlyPriceCents: 1990,
          // Blank, not just unset — a value the backend must clear, not leave alone.
          yearlyPriceCents: null,
        },
      },
      expect.anything(),
    );
  });

  it('clears an existing price by blanking its field, sending null instead of dropping the key', () => {
    const withPricing = {
      ...channel({ accessMode: 'SUBSCRIPTION' }),
      currency: 'USD',
      monthlyPriceCents: 1990,
      yearlyPriceCents: 19900,
    };
    render(<ChannelPricingForm initial={withPricing} />);

    type('dashboard.pricing.yearlyPrice', '');
    fireEvent.click(screen.getByText('dashboard.save'));

    expect(updateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          monthlyPriceCents: 1990,
          yearlyPriceCents: null,
        }),
      }),
      expect.anything(),
    );
  });

  it('leaves the channel FREE by default and submits with no pricing payload', () => {
    render(<ChannelPricingForm initial={channel()} />);

    fireEvent.click(screen.getByText('dashboard.save'));

    expect(updateMutate).toHaveBeenCalledWith(
      {
        id: 'ch-1',
        slug: 'canal-um',
        organizationId: 'org-1',
        input: { accessMode: 'FREE' },
      },
      expect.anything(),
    );
  });
});

describe('ChannelPricingForm — embedded', () => {
  beforeEach(() => {
    updateMutate.mockReset();
  });

  it('renders controlled and calls onChange without submitting anything', () => {
    const onChange = vi.fn();
    render(<ChannelPricingForm value={emptyPricingValue} onChange={onChange} />);

    expect(screen.queryByText('dashboard.save')).toBeNull();

    fireEvent.click(screen.getByLabelText(/^accessSubscriptionTitle/));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ accessMode: 'SUBSCRIPTION' } satisfies Partial<PricingValue>),
    );
    expect(updateMutate).not.toHaveBeenCalled();
  });
});
