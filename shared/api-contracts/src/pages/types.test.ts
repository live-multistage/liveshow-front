import { describe, expect, expectTypeOf, it } from 'vitest';
import type { PageDocumentV2 } from './document-v2';
import {
  PAGE_ASSET_LIMITS,
  PAGE_CONTEXT_TYPES,
  PAGE_KINDS,
  PAGE_LIMITS,
  PAGE_SECTION_REQUIRES_CONTEXT,
  PAGE_SECTION_TYPES,
  pageSlugError,
  slugifyPageTitle,
  type PageDetail,
  type PageDocument,
  type PageVersionDocument,
  type PublicPage,
  type PublishDiffResponse,
} from './types';

describe('slugifyPageTitle', () => {
  it('transliterates accents and joins words with hyphens', () => {
    expect(slugifyPageTitle('Festival de Verão 2027')).toBe('festival-de-verao-2027');
  });

  it('collapses punctuation and trims hyphens at both ends', () => {
    expect(slugifyPageTitle('  --Olá!!  Mundo-- ')).toBe('ola-mundo');
  });

  it('cuts to slugMax without leaving a trailing hyphen', () => {
    const slug = slugifyPageTitle('ab '.repeat(50));

    expect(slug.length).toBeLessThanOrEqual(PAGE_LIMITS.slugMax);
    expect(slug.endsWith('-')).toBe(false);
  });
});

describe('pageSlugError', () => {
  it('accepts a well-formed slug', () => {
    expect(pageSlugError('verao')).toBeNull();
  });

  it('flags uppercase, double hyphens, leading hyphen, empty and too long as format', () => {
    expect(pageSlugError('Verao')).toBe('format');
    expect(pageSlugError('a--b')).toBe('format');
    expect(pageSlugError('-a')).toBe('format');
    expect(pageSlugError('')).toBe('format');
    expect(pageSlugError('x'.repeat(PAGE_LIMITS.slugMax + 1))).toBe('format');
  });

  it('flags reserved slugs as reserved', () => {
    expect(pageSlugError('admin')).toBe('reserved');
  });
});

describe('PAGE_SECTION_TYPES', () => {
  it('lists the 12 unique section types', () => {
    expect(PAGE_SECTION_TYPES).toHaveLength(12);
    expect(new Set(PAGE_SECTION_TYPES).size).toBe(12);
  });
});

describe('v1 reservations', () => {
  it('only reserves standalone pages with no context', () => {
    expect(PAGE_KINDS).toEqual(['STANDALONE']);
    expect(PAGE_CONTEXT_TYPES).toEqual(['none']);
    expect(Object.keys(PAGE_SECTION_REQUIRES_CONTEXT).sort()).toEqual([...PAGE_SECTION_TYPES].sort());
    expect(Object.values(PAGE_SECTION_REQUIRES_CONTEXT).every((c) => c.length === 0)).toBe(true);
  });
});

describe('C1 edge cases', () => {
  it('cut at slugMax after a hyphen leaves no trailing hyphen', () => {
    const slug = slugifyPageTitle(`${'a'.repeat(59)} b`);
    expect(slug).toBe('a'.repeat(59));
  });
  it('accepts a slug of exactly slugMax and reserves p and _next', () => {
    expect(pageSlugError('a'.repeat(60))).toBeNull();
    expect(pageSlugError('p')).toBe('reserved');
    expect(pageSlugError('_next')).toBe('reserved');
  });
});

describe('publish diff and version document types', () => {
  it('accepts a publish diff response and a version document literal', () => {
    const diff: PublishDiffResponse = {
      added: 1,
      removed: 0,
      edited: 2,
      hidden: 0,
      hasChanges: true,
      nextVersionNumber: 4,
    };
    const version: PageVersionDocument = {
      number: 3,
      document: { schemaVersion: 1, context: { type: 'none' }, sections: [] },
    };

    expect(diff.nextVersionNumber).toBe(4);
    expect(version.document).toMatchObject({ sections: [] });
  });

  it('types the stored document of detail and version responses as v1 or v2, and the public page as v2', () => {
    expectTypeOf<PageDetail['draft']>().toEqualTypeOf<PageDocument | PageDocumentV2>();
    expectTypeOf<PageVersionDocument['document']>().toEqualTypeOf<PageDocument | PageDocumentV2>();
    expectTypeOf<PublicPage['document']>().toEqualTypeOf<PageDocumentV2>();
  });
});

describe('PAGE_ASSET_LIMITS', () => {
  it('caps uploads at 5 MB of png, jpeg or webp', () => {
    expect(PAGE_ASSET_LIMITS.maxBytes).toBe(5 * 1024 * 1024);
    expect(PAGE_ASSET_LIMITS.mimeTypes).toEqual(['image/png', 'image/jpeg', 'image/webp']);
  });
});
