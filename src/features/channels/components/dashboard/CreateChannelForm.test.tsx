import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { toast } from 'sonner';
import { CreateChannelForm } from './CreateChannelForm';

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
  useLocale: () => 'pt-BR',
}));

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

let organizations = [{ id: 'org-1', name: 'Org Um', slug: 'org-um' }];
vi.mock('@/features/organizations/queries/get-my-organizations', () => ({
  useMyOrganizationsQuery: () => ({ data: organizations }),
}));

const createMutate = vi.fn();
const uploadMutate = vi.fn();
const updateMutate = vi.fn();
vi.mock('../../mutations/channel.mutations', () => ({
  useCreateChannelMutation: () => ({ mutate: createMutate, isPending: false }),
  useUploadChannelCoverMutation: () => ({ mutate: uploadMutate, isPending: false }),
  useUpdateChannelMutation: () => ({ mutate: updateMutate, isPending: false }),
}));

const CREATE = 'channels.create';
const label = (key: string) => new RegExp(`^${CREATE}\\.${key}`);

const nameInput = () => screen.getByLabelText(label('nameLabel'));
const slugInput = () => screen.getByLabelText(label('slugLabel'));
const submitButton = () => screen.getByRole('button', { name: `${CREATE}.submit` });

const type = (element: HTMLElement, value: string) =>
  fireEvent.change(element, { target: { value } });

const fillValid = () => {
  type(nameInput(), 'Canal Clássico 24h');
};

const fileOfSize = (bytes: number, name = 'capa.png') => {
  const file = new File(['x'], name, { type: 'image/png' });
  Object.defineProperty(file, 'size', { value: bytes });
  return file;
};

const createdChannel = {
  id: 'ch-1',
  slug: 'canal-classico-24h',
  organizationId: 'org-1',
};

describe('CreateChannelForm', () => {
  beforeEach(() => {
    organizations = [{ id: 'org-1', name: 'Org Um', slug: 'org-um' }];
    createMutate.mockReset();
    uploadMutate.mockReset();
    updateMutate.mockReset();
    push.mockReset();
    vi.mocked(toast.success).mockReset();
  });

  it('derives the slug from the name until the slug is edited by hand', () => {
    render(<CreateChannelForm />);

    type(nameInput(), 'Canal do Sertão!');
    expect(slugInput()).toHaveValue('canal-do-sertao');

    type(slugInput(), 'meu-canal');
    type(nameInput(), 'Outro Nome');
    expect(slugInput()).toHaveValue('meu-canal');
  });

  it('keeps submit disabled until name and slug are valid', () => {
    render(<CreateChannelForm />);

    expect(submitButton()).toBeDisabled();

    type(nameInput(), 'A');
    expect(submitButton()).toBeDisabled();

    type(nameInput(), 'Canal Clássico 24h');
    expect(submitButton()).toBeEnabled();
  });

  it('does not submit a slug the backend would reject', () => {
    render(<CreateChannelForm />);

    fillValid();
    type(slugInput(), 'Canal Inválido!');
    fireEvent.click(submitButton());

    expect(createMutate).not.toHaveBeenCalled();
  });

  it('explains an invalid name on blur', () => {
    render(<CreateChannelForm />);

    type(nameInput(), 'A');
    fireEvent.blur(nameInput());

    expect(screen.getByText(`${CREATE}.nameError`)).toBeInTheDocument();
  });

  it('explains an invalid slug on blur', () => {
    render(<CreateChannelForm />);

    type(slugInput(), 'ab');
    fireEvent.blur(slugInput());

    expect(screen.getByText(`${CREATE}.slugError`)).toBeInTheDocument();
  });

  it('shows the slug as taken when the server answers 409', () => {
    createMutate.mockImplementation((_input, options) => options.onError({ status: 409 }));

    render(<CreateChannelForm />);
    fillValid();
    fireEvent.click(submitButton());

    expect(screen.getByText(`${CREATE}.slugTaken`)).toBeInTheDocument();
  });

  it('toggles the subscription notice with the access mode', () => {
    render(<CreateChannelForm />);

    expect(screen.queryByText(`${CREATE}.subscriptionNotice`)).toBeNull();

    fireEvent.click(screen.getByLabelText(label('accessSubscriptionTitle')));
    expect(screen.getByText(`${CREATE}.subscriptionNotice`)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(label('accessFreeTitle')));
    expect(screen.queryByText(`${CREATE}.subscriptionNotice`)).toBeNull();
  });

  it('rejects a cover larger than 5 MB', () => {
    render(<CreateChannelForm />);

    const dropzone = screen.getByLabelText(label('coverCta'));
    fireEvent.change(dropzone, { target: { files: [fileOfSize(6 * 1024 * 1024)] } });

    expect(screen.getByText(`${CREATE}.coverTooLarge`)).toBeInTheDocument();
    // O arquivo grande não fica pendurado esperando o submit.
    expect(screen.getByLabelText(label('coverCta'))).toBeInTheDocument();
  });

  it('creates the channel with the typed payload, then toasts and redirects', () => {
    createMutate.mockImplementation((_input, options) => options.onSuccess(createdChannel));

    render(<CreateChannelForm />);
    fillValid();
    type(screen.getByLabelText(label('descriptionLabel')), 'Só clássicos');

    fireEvent.click(submitButton());

    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        name: 'Canal Clássico 24h',
        slug: 'canal-classico-24h',
        description: 'Só clássicos',
        accessMode: 'FREE',
        timezone: expect.any(String),
      }),
      expect.anything(),
    );
    expect(toast.success).toHaveBeenCalledWith(`${CREATE}.successToast`);
    expect(push).toHaveBeenCalledWith('/dashboard/channels/canal-classico-24h');
  });

  it('prices a SUBSCRIPTION channel right after creation, since POST /channels does not accept prices', () => {
    createMutate.mockImplementation((_input, options) => options.onSuccess(createdChannel));

    render(<CreateChannelForm />);
    fillValid();
    fireEvent.click(screen.getByLabelText(label('accessSubscriptionTitle')));
    type(screen.getByLabelText('channels.dashboard.pricing.monthlyPrice'), '19.90');

    fireEvent.click(submitButton());

    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({ accessMode: 'SUBSCRIPTION' }),
      expect.anything(),
    );
    expect(updateMutate).toHaveBeenCalledWith({
      id: 'ch-1',
      slug: 'canal-classico-24h',
      organizationId: 'org-1',
      input: {
        accessMode: 'SUBSCRIPTION',
        currency: 'BRL',
        monthlyPriceCents: 1990,
        yearlyPriceCents: null,
      },
    });
  });

  it('keeps submit disabled for a SUBSCRIPTION channel with no price set', () => {
    render(<CreateChannelForm />);
    fillValid();
    fireEvent.click(screen.getByLabelText(label('accessSubscriptionTitle')));

    expect(submitButton()).toBeDisabled();
  });

  it('uploads the picked cover only after the channel exists', () => {
    createMutate.mockImplementation((_input, options) => options.onSuccess(createdChannel));

    render(<CreateChannelForm />);
    fillValid();

    const file = fileOfSize(1024);
    fireEvent.change(screen.getByLabelText(label('coverCta')), { target: { files: [file] } });
    expect(uploadMutate).not.toHaveBeenCalled();

    fireEvent.click(submitButton());

    expect(uploadMutate).toHaveBeenCalledWith({
      id: 'ch-1',
      slug: 'canal-classico-24h',
      organizationId: 'org-1',
      file,
    });
  });

  it('creates under the picked organization when there is more than one', () => {
    organizations = [
      { id: 'org-1', name: 'Org Um', slug: 'org-um' },
      { id: 'org-2', name: 'Org Dois', slug: 'org-dois' },
    ];

    render(<CreateChannelForm />);
    fillValid();
    type(screen.getByLabelText(label('organizationLabel')), 'org-2');

    fireEvent.click(submitButton());

    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'org-2' }),
      expect.anything(),
    );
  });

  it('lists the next steps so the draft is not mistaken for a live channel', () => {
    render(<CreateChannelForm />);

    expect(screen.getByText('channels.create.nextSteps.camerasTitle')).toBeInTheDocument();
    expect(screen.getByText('channels.create.nextSteps.lifecycle')).toBeInTheDocument();
  });
});
