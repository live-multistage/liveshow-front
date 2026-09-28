import { test, expect } from 'vitest';
import { messages, LOCALES } from '../../../../../shared/i18n-messages/src/index';

const keys = [
  'eventDetail.schedule.title',
  'eventDetail.schedule.empty',
  'events.detail.related.title',
  'createEvent.steps.schedule',
  'artists.listTitle',
  'artists.dashboard.catalog.title',
  'dashboard.nav.artists',
  'dashboard.navMobile.artists',
] as const;

function getPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc === null || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

test('keys dropped by the be-partner sync are restored in every locale', () => {
  for (const locale of LOCALES) {
    for (const key of keys) {
      const value = getPath(messages[locale], key);
      expect(typeof value, `${locale}.${key}`).toBe('string');
      expect((value as string).length, `${locale}.${key}`).toBeGreaterThan(0);
    }
  }
});
