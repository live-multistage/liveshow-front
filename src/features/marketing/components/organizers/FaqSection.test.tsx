import { describe, it, expect, vi } from 'vitest';

const faqItems = [
  { q: 'Question one', a: 'Answer one' },
  { q: 'Question two', a: 'Answer two' },
  { q: 'Question three', a: 'Answer three' },
];

vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string) => key;
    t.raw = (key: string) => (key === 'faq.items' ? faqItems : []);
    return t;
  },
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FaqSection } from './FaqSection';

describe('FaqSection', () => {
  it('renders every question with the first one expanded', () => {
    render(<FaqSection />);

    faqItems.forEach((item) => {
      expect(screen.getByText(item.q)).toBeInTheDocument();
    });

    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'true');
    expect(buttons[1]).toHaveAttribute('aria-expanded', 'false');
    expect(buttons[2]).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens the clicked item and collapses the previously open one', async () => {
    const user = userEvent.setup();
    render(<FaqSection />);

    const buttons = screen.getAllByRole('button');
    await user.click(buttons[2]);

    expect(buttons[0]).toHaveAttribute('aria-expanded', 'false');
    expect(buttons[2]).toHaveAttribute('aria-expanded', 'true');
  });

  it('collapses the item when clicked again, leaving none open', async () => {
    const user = userEvent.setup();
    render(<FaqSection />);

    const buttons = screen.getAllByRole('button');
    await user.click(buttons[2]);
    await user.click(buttons[2]);

    buttons.forEach((button) => {
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });
  });

  it('links the help CTA to /help', () => {
    render(<FaqSection />);
    expect(screen.getByRole('link', { name: /faq\.helpLink/ })).toHaveAttribute('href', '/help');
  });
});
