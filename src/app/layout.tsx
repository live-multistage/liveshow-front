import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';
import { QueryClient, dehydrate } from '@tanstack/react-query';
import { Providers } from '@/providers';
import { getInitialIsLoggedIn, getUserServer, checkAuthServer } from '@/features/account/queries/get-auth-state.server';
import '@/styles/globals.scss';

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

  const accessToken = (await cookies()).get('access_token')?.value;
  const initialIsLoggedIn = await getInitialIsLoggedIn();

  const qc = new QueryClient();
  const [initialUser] = await Promise.all([
    initialIsLoggedIn && accessToken ? getUserServer(accessToken) : Promise.resolve(null),
    initialIsLoggedIn && accessToken
      ? qc.prefetchQuery({
          queryKey: ['auth-check', 'access_dashboard', {}],
          queryFn: () => checkAuthServer('access_dashboard', {}, accessToken),
        })
      : Promise.resolve(),
  ]);

  return (
    <html lang={locale} className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>
          <Providers
            initialIsLoggedIn={initialIsLoggedIn}
            initialUser={initialUser}
            dehydratedState={dehydrate(qc)}
          >
            {children}
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
