vi.mock('next-intl', () => ({ useTranslations: () => (key: string, vars?: Record<string, unknown>) => (vars ? `${key} ${JSON.stringify(vars)}` : key) }));
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock('../queries/mailing.queries', () => ({ useMailingTemplatesQuery: vi.fn(), useMailingTemplateQuery: vi.fn(), useAudienceCountQuery: vi.fn() }));
vi.mock('../mutations/mailing.mutations', () => ({ useCreateMailingCampaignMutation: vi.fn(), useDispatchMailingCampaignMutation: vi.fn(), usePreviewMailingMutation: vi.fn() }));
vi.mock('./EventPicker', () => ({ EventPicker: () => <div data-testid="event-picker" /> }));
vi.mock('@/features/channels', () => ({ useChannelsQuery: () => ({ data: [] }) }));

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CampaignWizard } from './CampaignWizard';
import { useAudienceCountQuery, useMailingTemplateQuery, useMailingTemplatesQuery } from '../queries/mailing.queries';
import { useCreateMailingCampaignMutation, useDispatchMailingCampaignMutation, usePreviewMailingMutation } from '../mutations/mailing.mutations';

const templates = [
  { id: 't1', name: 'Testado', category: 'MARKETING', language: 'pt', version: 2, lastTestedVersion: 2, updatedAt: '' },
  { id: 't2', name: 'Mudou', category: 'MARKETING', language: 'pt', version: 3, lastTestedVersion: 2, updatedAt: '' },
];
const create = vi.fn();
const dispatch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useMailingTemplatesQuery).mockReturnValue({ data: templates, isLoading: false } as never);
  vi.mocked(useMailingTemplateQuery).mockReturnValue({ data: { ...templates[0], subject: 'Oi', preheader: '', blocks: [] } } as never);
  vi.mocked(useAudienceCountQuery).mockReturnValue({ data: { total: 1000, eligible: 850, skipped: { optedOut: 120, unverified: 20, deleted: 10 }, estimatedDays: 15 }, isLoading: false, isError: false } as never);
  vi.mocked(usePreviewMailingMutation).mockReturnValue({ mutate: vi.fn(), data: { subject: 'Oi', html: '<p>x</p>', text: '' } } as never);
  vi.mocked(useCreateMailingCampaignMutation).mockReturnValue({ mutate: create, isPending: false } as never);
  vi.mocked(useDispatchMailingCampaignMutation).mockReturnValue({ mutate: dispatch, isPending: false } as never);
});

async function toReview(templateName = 'Testado') {
  render(<CampaignWizard />);
  await userEvent.type(screen.getByLabelText('wizard.name'), 'Outubro');
  await userEvent.click(screen.getByRole('radio', { name: new RegExp(templateName) }));
  await userEvent.click(screen.getByRole('button', { name: 'wizard.next' }));
  await userEvent.click(screen.getByRole('button', { name: 'wizard.next' }));
}

describe('CampaignWizard', () => {
  it('flags untested templates in step 1', () => {
    render(<CampaignWizard />);
    expect(screen.getByRole('radio', { name: /Mudou/ })).toHaveAccessibleName(expect.stringContaining('wizard.untestedFlag'));
    expect(screen.getByRole('radio', { name: /Testado/ })).not.toHaveAccessibleName(expect.stringContaining('wizard.untestedFlag'));
  });

  it('shows the live audience count summary in step 2', async () => {
    render(<CampaignWizard />);
    await userEvent.type(screen.getByLabelText('wizard.name'), 'Outubro');
    await userEvent.click(screen.getByRole('radio', { name: /Testado/ }));
    await userEvent.click(screen.getByRole('button', { name: 'wizard.next' }));
    expect(screen.getByText('audience.summary {"eligible":850,"skipped":120,"days":15}')).toBeInTheDocument();
    expect(vi.mocked(useAudienceCountQuery).mock.calls.at(-1)![0]).toEqual({ audience: { type: 'ALL_VERIFIED' }, category: 'MARKETING' });
  });

  it('requires an explicit confirmation that states the eligible count, then creates + dispatches', async () => {
    create.mockImplementation((_req, opts) => opts.onSuccess({ id: 'c1' }));
    await toReview();
    await userEvent.click(screen.getByRole('button', { name: 'wizard.sendNow' }));
    expect(create).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toHaveTextContent('wizard.confirmNow {"count":850}');
    await userEvent.click(screen.getByRole('button', { name: 'wizard.confirmSend' }));
    expect(create).toHaveBeenCalledWith({ name: 'Outubro', templateId: 't1', audience: { type: 'ALL_VERIFIED' } }, expect.anything());
    expect(dispatch).toHaveBeenCalledWith({ id: 'c1' }, expect.anything());
  });

  it('routes to the editor on 409 TEMPLATE_NOT_TESTED', async () => {
    create.mockImplementation((_req, opts) => opts.onSuccess({ id: 'c1' }));
    dispatch.mockImplementation((_req, opts) => opts.onError({ status: 409, code: 'TEMPLATE_NOT_TESTED', message: '' }));
    await toReview('Mudou');
    await userEvent.click(screen.getByRole('button', { name: 'wizard.sendNow' }));
    await userEvent.click(screen.getByRole('button', { name: 'wizard.confirmSend' }));
    expect(screen.getByText('wizard.notTested')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'wizard.openEditor' })).toHaveAttribute('href', '/dashboard/platform/mailing/templates/t2');
  });

  it('reads the scheduled datetime as São Paulo wall-clock time', async () => {
    const { saoPauloToIso } = await import('./CampaignWizard');
    expect(saoPauloToIso('2026-10-01T20:00')).toBe('2026-10-01T23:00:00.000Z');
  });
});
