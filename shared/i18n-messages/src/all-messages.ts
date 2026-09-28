// Eager, all-locales-at-once access — for tests that assert cross-locale
// parity (same keys across pt/en/es). Deliberately NOT re-exported from
// './index': app code (src/i18n/request.ts) must only ever load the one
// locale it needs, and importing this file would defeat that.
import pt from '../pt.json';
import en from '../en.json';
import es from '../es.json';
import type { Locale, Messages } from './index';

export const allMessages: Record<Locale, Messages> = { pt, en: en as Messages, es: es as Messages };
