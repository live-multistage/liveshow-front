import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { loadMessages, isLocale, DEFAULT_LOCALE } from '@live-show/i18n-messages';
import { LOCALE_COOKIE } from './config';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  return { locale, messages: await loadMessages(locale) };
});
