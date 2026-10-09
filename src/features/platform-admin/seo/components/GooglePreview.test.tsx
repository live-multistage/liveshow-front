import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { GooglePreview } from './GooglePreview';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

const props = { description: '', noindex: false, sampleName: null };

describe('GooglePreview', () => {
  it('appends the layout suffix to the title', () => {
    const { container } = render(<GooglePreview {...props} title="Show X" path="/events/x" />);
    expect(container.textContent).toContain('Show X · showon.io');
  });

  it('leaves the home title as is', () => {
    const { container } = render(<GooglePreview {...props} title="showon.io" path="/" />);
    expect(container.textContent).not.toContain('showon.io · showon.io');
  });
});
