import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReplayComingSoon } from './ReplayComingSoon';

vi.mock('@/shared/components/Navbar', () => ({
  Navbar: () => <nav data-testid="navbar" />,
}));

vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string) => key;
    t.rich = (key: string) => key;
    return t;
  },
}));

describe('ReplayComingSoon', () => {
  it('renders the waiting room with breadcrumb back to the event', () => {
    render(<ReplayComingSoon eventId="ev-1" eventTitle="Festival Eletrônico" />);

    expect(screen.getByTestId('navbar')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back/ })).toHaveAttribute('href', '/events/ev-1');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('title');
    expect(screen.getByText('Festival Eletrônico')).toBeInTheDocument();
  });

  it('lists the three replay perks and the processing state', () => {
    render(<ReplayComingSoon eventId="ev-1" eventTitle="Show" />);

    expect(screen.getByText('include1')).toBeInTheDocument();
    expect(screen.getByText('include2')).toBeInTheDocument();
    expect(screen.getByText('include3')).toBeInTheDocument();
    expect(screen.getByText('processing')).toBeInTheDocument();
    expect(screen.getByText('ended')).toBeInTheDocument();
  });

  it('has no notify button (no replay-ready API yet)', () => {
    render(<ReplayComingSoon eventId="ev-1" eventTitle="Show" />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('uses the event cover as the frame background when provided', () => {
    const { container } = render(
      <ReplayComingSoon eventId="ev-1" eventTitle="Show" coverUrl="https://cdn/img.jpg" />,
    );

    const frame = container.querySelector('[style*="--cover"]');
    expect(frame).not.toBeNull();
  });
});
