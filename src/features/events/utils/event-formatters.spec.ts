import { describe, it, expect } from 'vitest';
import { formatPrice } from './event-formatters';

describe('formatPrice', () => {
  it('formats in the given currency', () => {
    expect(formatPrice(100, 'USD')).toContain('US$'); // pt-BR renders USD as "US$"
  });

  it('defaults to BRL', () => {
    expect(formatPrice(100)).toContain('R$');
  });
});
