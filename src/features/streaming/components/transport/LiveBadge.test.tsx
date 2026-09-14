import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { LiveBadge } from './LiveBadge';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

describe('LiveBadge', () => {
  it('is lit and non-interactive while at the live edge', () => {
    const { getByText, queryByRole } = render(<LiveBadge atLive />);
    expect(getByText('AO VIVO').tagName).toBe('SPAN');
    expect(queryByRole('button', { name: 'backToLive' })).toBeNull();
  });

  it('becomes a dimmed, clickable control once scrubbed back, and calls onBackToLive', () => {
    const onBackToLive = vi.fn();
    const { getByRole } = render(<LiveBadge atLive={false} onBackToLive={onBackToLive} />);
    const badge = getByRole('button', { name: 'backToLive' });
    expect(badge.textContent).toContain('AO VIVO');
    fireEvent.click(badge);
    expect(onBackToLive).toHaveBeenCalledTimes(1);
  });
});
