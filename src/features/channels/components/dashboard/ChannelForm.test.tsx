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

  it('does not submit without a name', () => {
    render(<ChannelForm initial={channel()} />);

    type('dashboard.name', '   ');
    fireEvent.click(screen.getByText('dashboard.save'));

    expect(updateMutate).not.toHaveBeenCalled();
  });
});
