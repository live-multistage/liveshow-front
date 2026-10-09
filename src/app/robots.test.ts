import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/seo/queries/get-seo.server', () => ({
  getSeoGlobal: vi.fn().mockResolvedValue(null),
}));

import robots from './robots';

describe('robots', () => {
  it('falls back to fixed rules when the SEO API is down', async () => {
    const r = await robots();
    const rules = Array.isArray(r.rules) ? r.rules : [r.rules];
    expect(rules).toHaveLength(1);
    expect(rules[0].userAgent).toBe('*');
  });
});
