import { describe, expect, it } from 'vitest';
import { describeAudience } from './describe-audience';

const t = (key: string) => key.split('.').pop() ?? key;

describe('describeAudience', () => {
  it('renders id-kind params as a truncated id, since names are unavailable here', () => {
    const summary = describeAudience({ type: 'ARTIST_FOLLOWERS', artistId: '11111111-2222-3333-4444-555555555555' }, t);
    expect(summary).toBe('ARTIST_FOLLOWERS · artistId: 11111111…');
  });

  it('still renders enum and int params as before', () => {
    const summary = describeAudience({ type: 'ABANDONED_CARTS', olderThanHours: 24 }, t);
    expect(summary).toBe('ABANDONED_CARTS · olderThanHours: 24');
  });
});
