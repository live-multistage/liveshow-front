import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SeriesBadge } from './SeriesBadge';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

describe('SeriesBadge', () => {
  it('renders as a link to the series page when a slug is given', () => {
    render(<SeriesBadge seriesSlug="quinta-do-rock" />);

    expect(screen.getByText('badge').closest('a')).toHaveAttribute(
      'href',
      '/series/quinta-do-rock',
    );
  });

  it('renders as plain text, not a link, when no slug is available', () => {
    render(<SeriesBadge seriesSlug={null} />);

    expect(screen.getByText('badge')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
