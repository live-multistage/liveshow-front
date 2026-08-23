import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Channel } from '../../types/channel.types';
import { ChannelForm } from './ChannelForm';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'pt-BR',
}));

const updateMutate = vi.fn();
const uploadMutate = vi.fn();
vi.mock('../../mutations/channel.mutations', () => ({
  useUpdateChannelMutation: () => ({ mutate: updateMutate, isPending: false }),
  useUploadChannelCoverMutation: () => ({ mutate: uploadMutate, isPending: false }),
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

describe('ChannelForm — edit', () => {
  beforeEach(() => {
    updateMutate.mockReset();
    uploadMutate.mockReset();
  });

  it('prefills the form from the channel and freezes the slug', () => {
    render(<ChannelForm initial={channel()} />);

    expect(screen.getByLabelText('dashboard.name')).toHaveValue('Canal Um');
    expect(screen.getByLabelText('dashboard.slug')).toHaveValue('canal-um');
    expect(screen.getByLabelText('dashboard.slug')).toHaveAttribute('readonly');
  });

  it('updates the channel with the changed fields', () => {
    render(<ChannelForm initial={channel()} />);

    type('dashboard.name', 'Canal Dois');
    type('dashboard.description', 'Só música');
    type('dashboard.timezone', 'Asia/Tokyo');

    fireEvent.click(screen.getByText('dashboard.save'));

    expect(updateMutate).toHaveBeenCalledWith(
      {
        id: 'ch-1',
        slug: 'canal-um',
        organizationId: 'org-1',
        input: {
          name: 'Canal Dois',
          description: 'Só música',
          timezone: 'Asia/Tokyo',
          accessMode: 'FREE',
        },
      },
      expect.anything(),
    );
  });

  it('uploads the picked cover file', () => {
    render(<ChannelForm initial={channel()} />);

    const file = new File(['x'], 'capa.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('dashboard.cover'), { target: { files: [file] } });

    expect(uploadMutate).toHaveBeenCalledWith({
      id: 'ch-1',
      slug: 'canal-um',
      organizationId: 'org-1',
      file,
    });
  });

  it('only accepts the image types the backend allows', () => {
    render(<ChannelForm initial={channel()} />);

    expect(screen.getByLabelText('dashboard.cover')).toHaveAttribute(
      'accept',
      'image/jpeg,image/png,image/webp',
    );
  });

  it('offers subscription access', () => {
    render(<ChannelForm initial={channel()} />);

    expect(screen.getByText('dashboard.accessSubscription')).not.toBeDisabled();
  });
});

describe('ChannelForm — subscription pricing', () => {
  beforeEach(() => {
    updateMutate.mockReset();
    uploadMutate.mockReset();
  });

  const enableSubscription = () => type('dashboard.accessMode', 'SUBSCRIPTION');

  it('hides pricing fields for a FREE channel', () => {
    render(<ChannelForm initial={channel()} />);

    expect(screen.queryByLabelText('dashboard.pricing.monthlyPrice')).toBeNull();
  });

  it('shows currency and price fields once SUBSCRIPTION is picked', () => {
    render(<ChannelForm initial={channel()} />);

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

    render(<ChannelForm initial={withPricing} />);

    expect(screen.getByLabelText('dashboard.pricing.currency')).toHaveValue('USD');
    expect(screen.getByLabelText('dashboard.pricing.monthlyPrice')).toHaveValue(19.9);
    expect(screen.getByLabelText('dashboard.pricing.yearlyPrice')).toHaveValue(199);
  });

  it('refuses to submit a SUBSCRIPTION channel with no price set', () => {
    render(<ChannelForm initial={channel()} />);
    enableSubscription();

    fireEvent.click(screen.getByText('dashboard.save'));

    expect(updateMutate).not.toHaveBeenCalled();
  });

  it('refuses a price below the 1,00 minimum', () => {
    render(<ChannelForm initial={channel()} />);
    enableSubscription();
    type('dashboard.pricing.monthlyPrice', '0.50');

    fireEvent.click(screen.getByText('dashboard.save'));

    expect(updateMutate).not.toHaveBeenCalled();
  });

  it('submits with at least one valid price, converted to cents, and the blank interval as null', () => {
    render(<ChannelForm initial={channel()} />);
    enableSubscription();
    type('dashboard.pricing.monthlyPrice', '19.90');

    fireEvent.click(screen.getByText('dashboard.save'));

    expect(updateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          accessMode: 'SUBSCRIPTION',
          currency: 'BRL',
          monthlyPriceCents: 1990,
          // Blank, not just unset — a value the backend must clear, not leave alone.
          yearlyPriceCents: null,
        }),
      }),
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
    render(<ChannelForm initial={withPricing} />);

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
});
