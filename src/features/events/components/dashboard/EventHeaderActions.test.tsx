import { describe, it, expect, vi } from 'vitest';
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventHeaderActions } from './EventHeaderActions';
import type { EventResponse } from '../../types/event.types';

function makeEvent(overrides: Partial<EventResponse> = {}): EventResponse {
  return {
    id: 'evt-1',
    title: 'Show',
    description: 'desc',
    category: 'MUSIC',
    organizationId: 'org-1',
    organization: null,
    startsAt: '2026-01-01T00:00:00Z',
    endsAt: '2026-01-01T02:00:00Z',
    status: 'LIVE',
    bannerUrl: null,
    thumbnailUrl: null,
    teaserVideoUrl: null,
    finishedAt: null,
    venue: null,
    city: null,
    country: null,
    venueData: null,
    visibility: 'PUBLIC',
    format: 'LIVE',
    latencyMode: 'STANDARD',
    domain: null,
    subtype: null,
    camerasCount: 0,
    isFree: true,
    publiclyFunded: false,
    ...overrides,
  };
}

const baseProps = {
  editing: false,
  isSaving: false,
  isPublishing: false,
  isUnpublishing: false,
  isFinishing: false,
  isResuming: false,
  onEdit: vi.fn(),
  onCancelEdit: vi.fn(),
  onSave: vi.fn(),
  onPublish: vi.fn(),
  onUnpublish: vi.fn(),
  onFinish: vi.fn(),
};

describe('EventHeaderActions resume live', () => {
  it('hides the resume button when the event is not FINISHED', () => {
    const onResumeLive = vi.fn();
    render(<EventHeaderActions {...baseProps} event={makeEvent({ status: 'LIVE' })} onResumeLive={onResumeLive} />);

    expect(screen.queryByText('resumeLive')).not.toBeInTheDocument();
  });

  it('hides the resume button once the 30-minute window has elapsed', () => {
    const onResumeLive = vi.fn();
    const finishedAt = new Date(Date.now() - 31 * 60 * 1000).toISOString();
    render(
      <EventHeaderActions
        {...baseProps}
        event={makeEvent({ status: 'FINISHED', finishedAt })}
        onResumeLive={onResumeLive}
      />,
    );

    expect(screen.queryByText('resumeLive')).not.toBeInTheDocument();
  });

  it('shows the resume button within the 30-minute window', () => {
    const onResumeLive = vi.fn();
    const finishedAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    render(
      <EventHeaderActions
        {...baseProps}
        event={makeEvent({ status: 'FINISHED', finishedAt })}
        onResumeLive={onResumeLive}
      />,
    );

    expect(screen.getByText('resumeLive')).toBeInTheDocument();
  });

  it('opens a confirm dialog on click, and only fires the mutation on confirm', async () => {
    const user = userEvent.setup();
    const onResumeLive = vi.fn();
    const finishedAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    render(
      <EventHeaderActions
        {...baseProps}
        event={makeEvent({ status: 'FINISHED', finishedAt })}
        onResumeLive={onResumeLive}
      />,
    );

    await user.click(screen.getByText('resumeLive'));
    expect(screen.getByText('resumeDialogTitle')).toBeInTheDocument();
    expect(onResumeLive).not.toHaveBeenCalled();

    await user.click(screen.getByText('cancel'));
    expect(onResumeLive).not.toHaveBeenCalled();
    expect(screen.queryByText('resumeDialogTitle')).not.toBeInTheDocument();
  });

  it('fires the mutation when the confirm dialog is confirmed', async () => {
    const user = userEvent.setup();
    const onResumeLive = vi.fn().mockResolvedValue(undefined);
    const finishedAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    render(
      <EventHeaderActions
        {...baseProps}
        event={makeEvent({ status: 'FINISHED', finishedAt })}
        onResumeLive={onResumeLive}
      />,
    );

    await user.click(screen.getByText('resumeLive'));
    await user.click(screen.getByText('resumeDialogConfirm'));

    expect(onResumeLive).toHaveBeenCalledTimes(1);
  });

  it('keeps the dialog open while the mutation is pending, then closes it on success', async () => {
    const user = userEvent.setup();
    let resolveResume: () => void = () => {};
    const onResumeLive = vi.fn(
      () => new Promise<void>((resolve) => { resolveResume = resolve; }),
    );
    const finishedAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    render(
      <EventHeaderActions
        {...baseProps}
        event={makeEvent({ status: 'FINISHED', finishedAt })}
        onResumeLive={onResumeLive}
      />,
    );

    await user.click(screen.getByText('resumeLive'));
    await user.click(screen.getByText('resumeDialogConfirm'));

    // Mutation hasn't settled yet — dialog must still be visible.
    expect(screen.getByText('resumeDialogTitle')).toBeInTheDocument();

    resolveResume();
    await waitFor(() => {
      expect(screen.queryByText('resumeDialogTitle')).not.toBeInTheDocument();
    });
  });

  it('keeps the dialog open when the mutation rejects', async () => {
    const user = userEvent.setup();
    const onResumeLive = vi.fn().mockRejectedValue(new Error('nope'));
    const finishedAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    render(
      <EventHeaderActions
        {...baseProps}
        event={makeEvent({ status: 'FINISHED', finishedAt })}
        onResumeLive={onResumeLive}
      />,
    );

    await user.click(screen.getByText('resumeLive'));
    await user.click(screen.getByText('resumeDialogConfirm'));

    await waitFor(() => expect(onResumeLive).toHaveBeenCalledTimes(1));
    expect(screen.getByText('resumeDialogTitle')).toBeInTheDocument();
  });
});

describe('EventHeaderActions readOnly', () => {
  it('hides every write action but keeps the status badge visible', () => {
    render(
      <EventHeaderActions
        {...baseProps}
        event={makeEvent({ status: 'DRAFT' })}
        onResumeLive={vi.fn()}
        readOnly
      />,
    );

    expect(screen.getByText('status.DRAFT')).toBeInTheDocument();
    expect(screen.queryByText('edit')).not.toBeInTheDocument();
    expect(screen.queryByText('publish')).not.toBeInTheDocument();
  });

  it('hides finish and resume actions when readOnly', () => {
    const finishedAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    render(
      <EventHeaderActions
        {...baseProps}
        event={makeEvent({ status: 'FINISHED', finishedAt })}
        onResumeLive={vi.fn()}
        readOnly
      />,
    );

    expect(screen.queryByText('resumeLive')).not.toBeInTheDocument();
  });

  it('shows write actions when readOnly is false or omitted', () => {
    render(
      <EventHeaderActions {...baseProps} event={makeEvent({ status: 'DRAFT' })} onResumeLive={vi.fn()} />,
    );

    expect(screen.getByText('edit')).toBeInTheDocument();
    expect(screen.getByText('publish')).toBeInTheDocument();
  });
});
