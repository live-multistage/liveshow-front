import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { LegalMarkdown } from './LegalMarkdown';

describe('LegalMarkdown', () => {
  it('renders headings, lists and links', () => {
    const { container } = render(<LegalMarkdown source={'## Dados\n\n- a\n- b\n\n[config](/settings)'} />);
    expect(container.querySelector('h2')?.textContent).toBe('Dados');
    expect(container.querySelectorAll('li')).toHaveLength(2);
    expect(container.querySelector('a')?.getAttribute('href')).toBe('/settings');
  });

  it('drops raw HTML instead of rendering it', () => {
    const { container } = render(<LegalMarkdown source={'<script>alert(1)</script><img src=x onerror=alert(1)> ok'} />);
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });

  it('marks external links noopener', () => {
    const { container } = render(<LegalMarkdown source={'[x](https://example.com)'} />);
    expect(container.querySelector('a')?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('neutralizes javascript: links', () => {
    const { container } = render(<LegalMarkdown source={'[x](javascript:alert(1))'} />);
    expect(container.querySelector('a')?.getAttribute('href') ?? '').not.toMatch(/^javascript:/);
  });
});
