vi.mock('next-intl', () => ({ useTranslations: () => (key: string, vars?: Record<string, unknown>) => (vars ? `${key} ${JSON.stringify(vars)}` : key) }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock('../queries/mailing.queries', () => ({ useMailingTemplatesQuery: vi.fn() }));
vi.mock('../mutations/mailing.mutations', () => ({
  useArchiveMailingTemplateMutation: vi.fn(),
  useDuplicateMailingTemplateMutation: vi.fn(),
}));

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplatesTab } from './TemplatesTab';
import { useMailingTemplatesQuery } from '../queries/mailing.queries';
import { useArchiveMailingTemplateMutation, useDuplicateMailingTemplateMutation } from '../mutations/mailing.mutations';

const templates = [
  { id: 't1', name: 'Welcome', category: 'TRANSACTIONAL', updatedAt: '2026-01-01T00:00:00Z', version: 2, lastTestedVersion: 2 },
  { id: 't2', name: 'Promo', category: 'MARKETING', updatedAt: '2026-01-02T00:00:00Z', version: 3, lastTestedVersion: 2 },
];

const archive = vi.fn();
const duplicate = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useMailingTemplatesQuery).mockReturnValue({ data: templates, isLoading: false, isError: false } as never);
  vi.mocked(useArchiveMailingTemplateMutation).mockReturnValue({ mutate: archive, isPending: false } as never);
  vi.mocked(useDuplicateMailingTemplateMutation).mockReturnValue({ mutate: duplicate, isPending: false } as never);
});

describe('TemplatesTab archive dialog error handling', () => {
  it('shows the archive error inside the dialog, not behind it', async () => {
    archive.mockImplementation((_id, opts) => opts.onError());
    render(<TemplatesTab />);

    await userEvent.click(screen.getAllByRole('button', { name: 'templates.archive' })[0]);
    await userEvent.click(screen.getByRole('button', { name: 'common.confirm' }));

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('templates.actionError');
    // Inside the dialog means it shares a DOM ancestor with the dialog title.
    expect(screen.getByText('templates.archiveTitle').compareDocumentPosition(alert) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('clears the error once the dialog is reopened', async () => {
    archive.mockImplementation((_id, opts) => opts.onError());
    render(<TemplatesTab />);

    await userEvent.click(screen.getAllByRole('button', { name: 'templates.archive' })[0]);
    await userEvent.click(screen.getByRole('button', { name: 'common.confirm' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'common.cancel' }));
    await userEvent.click(screen.getAllByRole('button', { name: 'templates.archive' })[1]);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('clears the error once an archive succeeds', async () => {
    archive.mockImplementation((_id, opts) => opts.onError());
    render(<TemplatesTab />);
    await userEvent.click(screen.getAllByRole('button', { name: 'templates.archive' })[0]);
    await userEvent.click(screen.getByRole('button', { name: 'common.confirm' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();

    archive.mockImplementation((_id, opts) => opts.onSuccess());
    await userEvent.click(screen.getByRole('button', { name: 'common.confirm' }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
