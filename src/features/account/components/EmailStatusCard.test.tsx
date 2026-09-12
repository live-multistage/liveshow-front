vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmailStatusCard } from './EmailStatusCard';

const base = {
  eyebrow: 'eyebrow-copy',
  title: 'title-copy',
  message: 'message-copy',
  protectedLabel: 'protected-copy',
};

describe('EmailStatusCard', () => {
  it('renders the variant, copy and a status region for the message', () => {
    const { container } = render(<EmailStatusCard variant="success" {...base} />);

    expect(container.querySelector('[data-variant="success"]')).toBeInTheDocument();
    expect(screen.getByText('eyebrow-copy')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'title-copy' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('message-copy');
    expect(screen.getByText('protected-copy')).toBeInTheDocument();
  });

  it('leaves the icon decorative unless a label is given', () => {
    const { rerender } = render(<EmailStatusCard variant="expired" {...base} />);
    expect(screen.queryByRole('img', { name: 'busy' })).not.toBeInTheDocument();

    rerender(<EmailStatusCard variant="loading" {...base} iconLabel="busy" />);
    expect(screen.getByRole('img', { name: 'busy' })).toBeInTheDocument();
  });

  it('omits optional pieces when not given', () => {
    render(<EmailStatusCard variant="expired" {...base} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByText('jane@example.com')).not.toBeInTheDocument();
  });

  it('renders the email pill, link and button actions, footer and slot when given', () => {
    const onClick = vi.fn();
    render(
      <EmailStatusCard
        variant="pending"
        {...base}
        email="jane@example.com"
        primaryAction={{ label: 'resend', onClick }}
        secondaryAction={{ label: 'back', href: '/login' }}
        footer={<p>footer-copy</p>}
      >
        <p>slot-copy</p>
      </EmailStatusCard>,
    );

    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'back' })).toHaveAttribute('href', '/login');
    expect(screen.getByText('footer-copy')).toBeInTheDocument();
    expect(screen.getByText('slot-copy')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'resend' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders a disabled action as a disabled button', () => {
    render(<EmailStatusCard variant="loading" {...base} primaryAction={{ label: 'wait', disabled: true }} />);

    expect(screen.getByRole('button', { name: 'wait' })).toBeDisabled();
  });
});
