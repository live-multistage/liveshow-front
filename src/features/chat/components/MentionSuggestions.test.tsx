import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MentionSuggestions } from './MentionSuggestions';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

const base = { id: 'lb', query: 'zz', options: [], activeIndex: 0, optionId: (i: number) => `o${i}`, onSelect: vi.fn() };

describe('MentionSuggestions a11y', () => {
  it('announces the empty state politely', () => {
    render(<MentionSuggestions {...base} loading={false} empty />);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('mentions.noResults');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('marks the listbox busy while loading', () => {
    render(<MentionSuggestions {...base} loading empty={false} />);
    expect(screen.getByRole('listbox')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('status')).toBeNull();
  });
});
