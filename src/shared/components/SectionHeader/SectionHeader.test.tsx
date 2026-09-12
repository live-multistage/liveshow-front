import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SectionHeader } from './SectionHeader';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('SectionHeader', () => {
  it('renders an h2 with the given id', () => {
    render(<SectionHeader title="Ao vivo agora" titleId="live-now-heading" />);

    const heading = screen.getByRole('heading', { level: 2, name: 'Ao vivo agora' });
    expect(heading.id).toBe('live-now-heading');
  });

  it('omits the eyebrow node when none is given', () => {
    const { container } = render(<SectionHeader title="Ao vivo agora" titleId="live-now-heading" />);

    expect(container.querySelectorAll('[data-testid="section-eyebrow"]')).toHaveLength(0);
  });

  it('renders the given eyebrow', () => {
    render(<SectionHeader title="Canais" titleId="channels-heading" eyebrow="TV linear · 24h" />);

    expect(screen.getByTestId('section-eyebrow')).toHaveTextContent('TV linear · 24h');
  });

  it('renders a see-all link with an aria-hidden icon when seeAllHref is given', () => {
    render(<SectionHeader title="Ao vivo agora" titleId="live-now-heading" seeAllHref="/events" />);

    const link = screen.getByText('seeAll');
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/events');
    expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders no link when seeAllHref is omitted', () => {
    render(<SectionHeader title="Ao vivo agora" titleId="live-now-heading" />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
