import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Channel } from '../../types/channel.types';
import { ChannelForm, slugify } from './ChannelForm';

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
const uploadMutate = vi.fn();
vi.mock('../../mutations/channel.mutations', () => ({
  useCreateChannelMutation: () => ({ mutate: createMutate, isPending: false }),
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

const fill = () => {
  type('dashboard.name', 'Canal Um');
  type('dashboard.slug', 'canal-um');
  type('dashboard.timezone', 'America/Sao_Paulo');
};

describe('ChannelForm — create', () => {
  beforeEach(() => {
    createMutate.mockReset();
    updateMutate.mockReset();
    uploadMutate.mockReset();
    push.mockReset();
  });

  it('creates the channel with the typed slug, name and timezone', () => {
    render(<ChannelForm />);
    fill();

    fireEvent.click(screen.getByText('dashboard.save'));

    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'canal-um',
        name: 'Canal Um',
        timezone: 'America/Sao_Paulo',
        organizationId: 'org-1',
      }),
      expect.anything(),
    );
  });

  it('creates the channel under the picked organization', () => {
    render(<ChannelForm />);
    fill();
    type('nav.organizations', 'org-2');

    fireEvent.click(screen.getByText('dashboard.save'));

    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'org-2' }),
      expect.anything(),
    );
  });

  it('does not submit an incomplete form', () => {
    render(<ChannelForm />);

    fireEvent.click(screen.getByText('dashboard.save'));

    expect(createMutate).not.toHaveBeenCalled();
  });

  it('goes to the new channel once it is created', () => {
    createMutate.mockImplementation((_input, options) =>
      options.onSuccess({ id: 'ch-1', slug: 'canal-um' }),
    );

    render(<ChannelForm />);
    fill();
    fireEvent.click(screen.getByText('dashboard.save'));

    expect(push).toHaveBeenCalledWith('/dashboard/channels/canal-um');
  });

  it('derives the slug from the name until the slug is edited by hand', () => {
    render(<ChannelForm />);

    type('dashboard.name', 'Canal do Sertão!');
    expect(screen.getByLabelText('dashboard.slug')).toHaveValue('canal-do-sertao');

    type('dashboard.slug', 'meu-canal');
    type('dashboard.name', 'Outro Nome');
    expect(screen.getByLabelText('dashboard.slug')).toHaveValue('meu-canal');
  });

  it('refuses to submit a slug the backend would reject', () => {
    render(<ChannelForm />);
    fill();

    type('dashboard.slug', 'Canal Inválido!');
    fireEvent.click(screen.getByText('dashboard.save'));
    expect(createMutate).not.toHaveBeenCalled();

    // Curto demais também não passa.
    type('dashboard.slug', 'ab');
    fireEvent.click(screen.getByText('dashboard.save'));
    expect(createMutate).not.toHaveBeenCalled();
  });

  it('constrains the slug natively too', () => {
    render(<ChannelForm />);

    const slugInput = screen.getByLabelText('dashboard.slug');
    expect(slugInput).toHaveAttribute('pattern', '[a-z0-9]+(-[a-z0-9]+)*');
    expect(slugInput).toHaveAttribute('minLength', '3');
    expect(slugInput).toHaveAttribute('maxLength', '80');
  });
});

describe('ChannelForm — edit', () => {
  beforeEach(() => {
    createMutate.mockReset();
    updateMutate.mockReset();
    uploadMutate.mockReset();
  });

  it('prefills the form from the channel and freezes the slug', () => {
    render(<ChannelForm mode="edit" initial={channel()} />);

    expect(screen.getByLabelText('dashboard.name')).toHaveValue('Canal Um');
    expect(screen.getByLabelText('dashboard.slug')).toHaveValue('canal-um');
    expect(screen.getByLabelText('dashboard.slug')).toHaveAttribute('readonly');
  });

  it('updates the channel with the changed fields', () => {
    render(<ChannelForm mode="edit" initial={channel()} />);

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
    expect(createMutate).not.toHaveBeenCalled();
  });

  it('uploads the picked cover file', () => {
    render(<ChannelForm mode="edit" initial={channel()} />);

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
    render(<ChannelForm mode="edit" initial={channel()} />);

    expect(screen.getByLabelText('dashboard.cover')).toHaveAttribute(
      'accept',
      'image/jpeg,image/png,image/webp',
    );
  });

  it('offers subscription access but keeps it disabled until billing exists', () => {
    render(<ChannelForm mode="edit" initial={channel()} />);

    expect(screen.getByText('dashboard.accessSubscription')).toBeDisabled();
  });
});

describe('slugify', () => {
  it('strips accents, case and punctuation', () => {
    expect(slugify('Canal do Sertão!')).toBe('canal-do-sertao');
  });

  it('does not leave dangling separators', () => {
    expect(slugify('  --Canal--  ')).toBe('canal');
  });
});
