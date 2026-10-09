import { describe, expect, it } from 'vitest';
import { pickLocaleContent } from './pick-locale-content';

describe('pickLocaleContent', () => {
  const content = { pt: 'pt text', en: 'en text' };
  it('returns the requested locale', () => expect(pickLocaleContent(content, 'en')).toBe('en text'));
  it('falls back to pt when missing', () => expect(pickLocaleContent(content, 'es')).toBe('pt text'));
  it('falls back to pt when blank', () => expect(pickLocaleContent({ pt: 'p', es: '  ' }, 'es')).toBe('p'));
  it('handles unknown locale', () => expect(pickLocaleContent(content, 'fr')).toBe('pt text'));
});
