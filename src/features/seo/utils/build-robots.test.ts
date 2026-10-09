import { describe, expect, it } from 'vitest';
import { buildRobots, FIXED_DISALLOW } from './build-robots';

const rulesOf = (r: ReturnType<typeof buildRobots>) => (Array.isArray(r.rules) ? r.rules : [r.rules]);

describe('buildRobots', () => {
  it('fixed rules come first and are unchanged', () => {
    const rules = rulesOf(buildRobots([{ userAgent: 'GPTBot', allow: [], disallow: ['/'] }]));
    expect(rules[0]).toEqual({ userAgent: '*', allow: '/', disallow: FIXED_DISALLOW });
    expect(rules[1]).toEqual({ userAgent: 'GPTBot', disallow: ['/'] });
  });

  it('extra rules for * are a separate group and cannot drop fixed paths', () => {
    const rules = rulesOf(buildRobots([{ userAgent: '*', allow: ['/dashboard/'], disallow: [] }]));
    expect(rules[0].disallow).toContain('/dashboard/');
  });

  it('defensively skips rules with line breaks even if the API let one through', () => {
    const rules = rulesOf(
      buildRobots([
        { userAgent: 'a\nb', allow: [], disallow: ['/x'] },
        { userAgent: 'ok', allow: [], disallow: ['/y\nDisallow: /'] },
      ]),
    );
    expect(rules).toHaveLength(2);
    expect(rules[1]).toEqual({ userAgent: 'ok', disallow: [] });
  });
});
