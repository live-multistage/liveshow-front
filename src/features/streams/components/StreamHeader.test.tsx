import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StreamHeader } from './StreamHeader';
import type { StreamResponse } from '../types/stream.types';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('../mutations/stream.mutations', () => ({ useDeleteStreamMutation: () => ({ mutate: vi.fn() }) }));

const stream: StreamResponse = {
  id: 's', eventId: 'e', programId: null, title: 'Main', status: 'READY', position: 0,
  createdAt: '2026-01-01', updatedAt: '2026-01-01',
};
const action = { onClick: vi.fn(), isPending: false };

function renderHeader(props: { canMoveUp?: boolean; canMoveDown?: boolean; onMove?: (d: -1 | 1) => void }) {
  return render(
    <StreamHeader
      stream={stream} prepare={action} start={action} end={action} cancel={action} rollback={action}
      onRename={vi.fn()} isRenaming={false} showLifecycle {...props}
    />,
  );
}

describe('StreamHeader reorder buttons', () => {
  it('calls onMove with the clicked direction', () => {
    const onMove = vi.fn();
    renderHeader({ onMove, canMoveUp: true, canMoveDown: true });
    fireEvent.click(screen.getByLabelText('moveUp'));
    fireEvent.click(screen.getByLabelText('moveDown'));
    expect(onMove.mock.calls).toEqual([[-1], [1]]);
  });

  it('disables a direction that cannot move (edge or reorder pending)', () => {
    const onMove = vi.fn();
    renderHeader({ onMove, canMoveUp: false, canMoveDown: false });
    const up = screen.getByLabelText('moveUp') as HTMLButtonElement;
    const down = screen.getByLabelText('moveDown') as HTMLButtonElement;
    expect(up.disabled).toBe(true);
    expect(down.disabled).toBe(true);
    fireEvent.click(up);
    expect(onMove).not.toHaveBeenCalled();
  });
});
