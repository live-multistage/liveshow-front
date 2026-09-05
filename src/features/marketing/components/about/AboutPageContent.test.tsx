import { describe, it, expect, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { render, screen } from '@testing-library/react';
import { AboutPageContent } from './AboutPageContent';

describe('AboutPageContent', () => {
  it('renders the hero heading', () => {
    render(<AboutPageContent />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('renders the three pillar labels', () => {
    render(<AboutPageContent />);
    expect(screen.getByText('pillars.viewers.label')).toBeInTheDocument();
    expect(screen.getByText('pillars.organizers.label')).toBeInTheDocument();
    expect(screen.getByText('pillars.tech.label')).toBeInTheDocument();
  });

  it('links the organizers pillar and footer link to /para-organizadores', () => {
    render(<AboutPageContent />);
    const links = screen.getAllByRole('link', { name: /pillars\.organizers\.link|links\.organizers/ });
    expect(links.length).toBeGreaterThanOrEqual(1);
    links.forEach((link) => expect(link).toHaveAttribute('href', '/para-organizadores'));
  });

  it('links contact via mailto', () => {
    render(<AboutPageContent />);
    const contact = screen.getByRole('link', { name: /links\.contact/ });
    expect(contact.getAttribute('href')).toMatch(/^mailto:/);
  });

  it('links help to /help', () => {
    render(<AboutPageContent />);
    expect(screen.getByRole('link', { name: /links\.help/ })).toHaveAttribute('href', '/help');
  });
});
