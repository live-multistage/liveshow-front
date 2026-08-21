import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChannelForm } from './ChannelForm';

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

const mutate = vi.fn();
vi.mock('../../mutations/channel.mutations', () => ({
  useCreateChannelMutation: () => ({ mutate, isPending: false }),
}));

const fill = () => {
  fireEvent.change(screen.getByLabelText('dashboard.name'), { target: { value: 'Canal Um' } });
  fireEvent.change(screen.getByLabelText('dashboard.slug'), { target: { value: 'canal-um' } });
  fireEvent.change(screen.getByLabelText('dashboard.timezone'), {
    target: { value: 'America/Sao_Paulo' },
  });
};

describe('ChannelForm', () => {
  beforeEach(() => {
    mutate.mockReset();
    push.mockReset();
  });

  it('creates the channel with the typed slug, name and timezone', () => {
    render(<ChannelForm />);
    fill();

    fireEvent.click(screen.getByText('dashboard.save'));

    expect(mutate).toHaveBeenCalledWith(
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
    fireEvent.change(screen.getByLabelText('nav.organizations'), {
      target: { value: 'org-2' },
    });

    fireEvent.click(screen.getByText('dashboard.save'));

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'org-2' }),
      expect.anything(),
    );
  });

  it('does not submit an incomplete form', () => {
    render(<ChannelForm />);

    fireEvent.click(screen.getByText('dashboard.save'));

    expect(mutate).not.toHaveBeenCalled();
  });

  it('goes to the new channel once it is created', () => {
    mutate.mockImplementation((_input, options) =>
      options.onSuccess({ id: 'ch-1', slug: 'canal-um' }),
    );

    render(<ChannelForm />);
    fill();
    fireEvent.click(screen.getByText('dashboard.save'));

    expect(push).toHaveBeenCalledWith('/dashboard/channels/canal-um');
  });
});
