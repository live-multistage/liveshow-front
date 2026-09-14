vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('../mutations/blueprints.mutations', () => ({ useCreateBlueprintMutation: vi.fn() }));

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NewBlueprintDialog } from './NewBlueprintDialog';
import { useCreateBlueprintMutation } from '../mutations/blueprints.mutations';

const create = vi.fn();
const onCreated = vi.fn();
const onOpenChange = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useCreateBlueprintMutation).mockReturnValue({ mutate: create, isPending: false } as never);
});

describe('NewBlueprintDialog', () => {
  it('creates a blueprint with name and optional description, then navigates via onCreated', async () => {
    create.mockImplementation((_data, options) => options?.onSuccess?.({ id: 'b9' }));
    render(<NewBlueprintDialog open onOpenChange={onOpenChange} onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText('name'), 'Lembrete — salvou');
    await userEvent.type(screen.getByLabelText('newDialog.descriptionLabel'), 'Push 24h antes');
    await userEvent.click(screen.getByRole('button', { name: 'create' }));

    expect(create).toHaveBeenCalledWith({ name: 'Lembrete — salvou', description: 'Push 24h antes' }, expect.anything());
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onCreated).toHaveBeenCalledWith('b9');
  });

  it('disables Criar until a name is typed', () => {
    render(<NewBlueprintDialog open onOpenChange={onOpenChange} onCreated={onCreated} />);
    expect(screen.getByRole('button', { name: 'create' })).toBeDisabled();
  });

  it('shows the mapped error on failure', async () => {
    create.mockImplementation((_data, options) => options?.onError?.({ message: 'x', status: 500, code: 'GENERIC' }));
    render(<NewBlueprintDialog open onOpenChange={onOpenChange} onCreated={onCreated} />);
    await userEvent.type(screen.getByLabelText('name'), 'Falha');
    await userEvent.click(screen.getByRole('button', { name: 'create' }));
    expect(screen.getByRole('alert')).toHaveTextContent('errors.GENERIC');
  });
});
