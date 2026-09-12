import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EditorialHome } from './EditorialHome';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
vi.mock('@/features/advertisements/components/AdBanner', () => ({
  AdBanner: () => null,
}));

// Document outline: EditorialHome owns the page's single stable <h1>,
// rendered unconditionally (visually hidden) regardless of whether there is
// hero content to show — a rotating carousel or an empty feed must never
// leave the page without a heading, or duplicate it.
describe('EditorialHome heading outline', () => {
  it('renders exactly one <h1> with the headline text when there are zero hero slides', () => {
    render(<EditorialHome isLoggedIn={false} />);

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('headline');
  });
});
