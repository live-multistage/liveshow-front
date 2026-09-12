vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock('../queries/mailing.queries', () => ({ useMailingTemplateQuery: vi.fn() }));
vi.mock('../mutations/mailing.mutations', () => ({
  useSaveMailingTemplateMutation: vi.fn(), useTestSendMailingMutation: vi.fn(), useUploadMailingAssetMutation: vi.fn(),
}));
vi.mock('../hooks/use-debounced-preview', () => ({ useDebouncedPreview: vi.fn() }));
vi.mock('./EventPicker', () => ({ EventPicker: () => <div data-testid="event-picker" /> }));

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateEditorPage } from './TemplateEditorPage';
import { useMailingTemplateQuery } from '../queries/mailing.queries';
import { useSaveMailingTemplateMutation, useTestSendMailingMutation, useUploadMailingAssetMutation } from '../mutations/mailing.mutations';
import { useDebouncedPreview } from '../hooks/use-debounced-preview';

const saved = {
  id: 't1', name: 'Promo', category: 'MARKETING', subject: 'Oi', preheader: '', language: 'pt',
  blocks: [{ type: 'heading', text: 'Primeiro', size: 'lg' }, { type: 'divider' }],
  version: 2, lastTestedVersion: 2, createdBy: 'a', createdAt: '', updatedAt: '', archivedAt: null,
};
const save = vi.fn();
const testSend = vi.fn();

function setup(template = saved) {
  vi.mocked(useMailingTemplateQuery).mockReturnValue({ data: template, isLoading: false } as never);
  vi.mocked(useSaveMailingTemplateMutation).mockReturnValue({ mutate: save, isPending: false } as never);
  vi.mocked(useTestSendMailingMutation).mockReturnValue({ mutate: testSend, isPending: false, isSuccess: false, error: null } as never);
  vi.mocked(useUploadMailingAssetMutation).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  vi.mocked(useDebouncedPreview).mockReturnValue({ preview: { subject: 'Oi', html: '<p>preview</p>', text: '' }, invalid: false, isError: false });
  return render(<TemplateEditorPage templateId="t1" />);
}
const blockRows = () => screen.getAllByTestId('block-row');

describe('TemplateEditorPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the tested badge for the current version', () => {
    setup();
    expect(screen.getByText('editor.testedBadge')).toBeInTheDocument();
  });

  it('adds a block from the + menu', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'editor.addBlock' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'editor.block.button' }));
    expect(blockRows()).toHaveLength(3);
    expect(within(blockRows()[2]).getByText('editor.block.button')).toBeInTheDocument();
  });

  it('reorders with the ↑/↓ buttons (keyboard-accessible path)', async () => {
    setup();
    await userEvent.click(within(blockRows()[1]).getByRole('button', { name: 'editor.moveUp' }));
    expect(within(blockRows()[0]).getByText('editor.block.divider')).toBeInTheDocument();
    expect(within(blockRows()[0]).getByRole('button', { name: 'editor.moveUp' })).toBeDisabled();
  });

  it('edits a block in the inspector and removes a block', async () => {
    setup();
    await userEvent.click(within(blockRows()[0]).getByText('editor.block.heading'));
    const input = screen.getByLabelText('editor.field.text');
    await userEvent.clear(input);
    await userEvent.type(input, 'Novo título');
    const lastDraft = vi.mocked(useDebouncedPreview).mock.calls.at(-1)![0];
    expect(lastDraft.blocks[0]).toEqual({ type: 'heading', text: 'Novo título', size: 'lg' });
    await userEvent.click(within(blockRows()[1]).getByRole('button', { name: 'editor.remove' }));
    expect(blockRows()).toHaveLength(1);
  });

  it('renders the preview in a sandboxed iframe without scripts', () => {
    setup();
    const frame = screen.getByTitle('editor.previewTitle');
    expect(frame).toHaveAttribute('sandbox', '');
    expect(frame).toHaveAttribute('srcdoc', '<p>preview</p>');
  });

  it('test send is disabled while dirty and enabled once saved', async () => {
    setup();
    const button = screen.getByRole('button', { name: 'editor.testSend' });
    expect(button).toBeEnabled();
    await userEvent.click(button);
    expect(testSend).toHaveBeenCalledWith('t1', expect.anything());
    await userEvent.type(screen.getByLabelText('editor.subject'), '!');
    expect(screen.getByRole('button', { name: 'editor.testSend' })).toBeDisabled();
    expect(screen.getByText('editor.saveBeforeTest')).toBeInTheDocument();
  });

  it('shows the untested badge when the saved version was not tested', () => {
    setup({ ...saved, lastTestedVersion: 1 });
    expect(screen.getByText('editor.untestedBadge')).toBeInTheDocument();
  });
});
