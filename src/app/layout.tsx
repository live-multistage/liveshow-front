import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';
import { Providers } from '@/providers';
import { getInitialIsLoggedIn } from '@/features/account/queries/get-auth-state.server';
import '@/styles/index.css';

export const metadata: Metadata = {
  title: {
    default: 'Liveshow',
    template: '%s · Liveshow',
  },
  description: 'Shows ao vivo de todo o mundo, na palma da sua mão.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  const initialIsLoggedIn = await getInitialIsLoggedIn();

  return (
    <html lang={locale} className="dark">
      <body>
        <NextIntlClientProvider messages={messages}>
          <Providers initialIsLoggedIn={initialIsLoggedIn}>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
