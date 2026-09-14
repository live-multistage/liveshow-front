vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string) => key;
    t.has = (key: string) => key === 'errors.BLUEPRINT_NOT_FOUND';
    return t;
  },
}));
vi.mock('../mutations/blueprints.mutations', () => ({ useSaveBlueprintVersionMutation: vi.fn() }));

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportJsonDialog } from './ImportJsonDialog';
import { useSaveBlueprintVersionMutation } from '../mutations/blueprints.mutations';

const save = vi.fn();
const onOpenChange = vi.fn();
const graph = { schemaVersion: 1, nodes: [], edges: [] };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useSaveBlueprintVersionMutation).mockReturnValue({ mutate: save, isPending: false } as never);
});

describe('ImportJsonDialog', () => {
  it('rejects invalid JSON without calling the mutation', async () => {
    render(<ImportJsonDialog blueprintId="b1" open onOpenChange={onOpenChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '{ nope' } });
    await userEvent.click(screen.getByRole('button', { name: 'detail.importSubmit' }));
    expect(screen.getByRole('alert')).toHaveTextContent('detail.invalidJson');
    expect(save).not.toHaveBeenCalled();
  });

  it('parses valid JSON and saves a new draft version, then closes', async () => {
    save.mockImplementation((_data, options) => options?.onSuccess?.());
    render(<ImportJsonDialog blueprintId="b1" open onOpenChange={onOpenChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: JSON.stringify(graph) } });
    await userEvent.click(screen.getByRole('button', { name: 'detail.importSubmit' }));
    expect(save).toHaveBeenCalledWith({ id: 'b1', graph }, expect.anything());
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it.each([['[]', '[]'], ['123', '123'], ['null', 'null']])('rejects valid-but-non-object JSON (%s) without calling the mutation', async (_label, json) => {
    render(<ImportJsonDialog blueprintId="b1" open onOpenChange={onOpenChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: json } });
    await userEvent.click(screen.getByRole('button', { name: 'detail.importSubmit' }));
    expect(screen.getByRole('alert')).toHaveTextContent('detail.invalidJson');
    expect(save).not.toHaveBeenCalled();
  });

  it('shows the mapped message for a known error code, and GENERIC for an unmapped one', async () => {
    save.mockImplementation((_data, options) => options?.onError?.({ code: 'BLUEPRINT_NOT_FOUND' }));
    render(<ImportJsonDialog blueprintId="b1" open onOpenChange={onOpenChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: JSON.stringify(graph) } });
    await userEvent.click(screen.getByRole('button', { name: 'detail.importSubmit' }));
    expect(screen.getByRole('alert')).toHaveTextContent('errors.BLUEPRINT_NOT_FOUND');

    save.mockImplementation((_data, options) => options?.onError?.({ code: 'SOME_UNKNOWN_CODE' }));
    await userEvent.click(screen.getByRole('button', { name: 'detail.importSubmit' }));
    expect(screen.getByRole('alert')).toHaveTextContent('errors.GENERIC');
  });
});
