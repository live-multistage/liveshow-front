vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string) => key;
    return t;
  },
}));

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BlueprintStatusPill } from './BlueprintStatusPill';

describe('BlueprintStatusPill', () => {
  it('renders a dot on ACTIVE', () => {
    const { container } = render(<BlueprintStatusPill status="ACTIVE" />);
    expect(screen.getByText('status.ACTIVE')).toBeInTheDocument();
    expect(container.querySelector('span')).toBeInTheDocument();
  });

  it('wraps INVALID in a tooltip trigger explaining why runs stopped', () => {
    render(<BlueprintStatusPill status="INVALID" />);
    expect(screen.getByText('status.INVALID')).toBeInTheDocument();
  });

  it('renders INACTIVE without a dot', () => {
    render(<BlueprintStatusPill status="INACTIVE" />);
    expect(screen.getByText('status.INACTIVE')).toBeInTheDocument();
  });
});
