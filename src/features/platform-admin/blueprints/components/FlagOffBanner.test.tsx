vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string) => key;
    t.rich = (key: string) => key;
    return t;
  },
}));

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FlagOffBanner } from './FlagOffBanner';

describe('FlagOffBanner', () => {
  it('renders nothing when the flag is on', () => {
    const { container } = render(<FlagOffBanner visible={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the amber banner when the flag is off', () => {
    render(<FlagOffBanner visible />);
    expect(screen.getByRole('status')).toHaveTextContent('flagOffBanner');
  });
});
