import type { SeoRobotsRule } from '@live-show/api-contracts';
import { FIXED_DISALLOW, SINGLE_LINE, groupDisallow } from '@/features/seo/utils/build-robots';

export const MAX_ROBOTS_RULES = 20;

export type RobotsRuleError = 'agent' | 'path' | null;

// Same single-line rule the public robots.txt builder enforces (it silently drops violators).
export function robotsRuleError(rule: SeoRobotsRule): RobotsRuleError {
  if (!SINGLE_LINE.test(rule.userAgent.trim())) return 'agent';
  const paths = [...rule.allow, ...rule.disallow];
  return paths.every((p) => p.startsWith('/') && SINGLE_LINE.test(p)) ? null : 'path';
}

export const isValidRobotsPath = (path: string): boolean => path.startsWith('/') && SINGLE_LINE.test(path);

export function renderRobotsTxt(extra: SeoRobotsRule[]): string {
  const lines = ['User-agent: *', 'Allow: /', ...FIXED_DISALLOW.map((p) => `Disallow: ${p}`)];
  for (const rule of extra) {
    lines.push('', `User-agent: ${rule.userAgent}`);
    rule.allow.forEach((p) => lines.push(`Allow: ${p}`));
    groupDisallow(rule.disallow).forEach((p) => lines.push(`Disallow: ${p}`));
  }
  return lines.join('\n');
}
