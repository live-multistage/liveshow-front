import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';
import { QueryClient, dehydrate } from '@tanstack/react-query';
import { Providers } from '@/providers';
import { getInitialIsLoggedIn, getUserServer, checkAuthServer } from '@/features/account/queries/get-auth-state.server';
import { ConsentBanner } from '@/features/consent';
import { JsonLd } from '@/shared/components/JsonLd';
import '@/styles/globals.scss';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://showon.io';
const SITE_DESCRIPTION = 'Shows ao vivo de todo o mundo, na palma da sua mão.';

export const metadata: Metadata = {
  // Anchors every relative URL in OG/canonical/twitter metadata to the real
  // host — without it Next resolves them against localhost.
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'showon.io',
    template: '%s · showon.io',
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: 'website',
    siteName: 'showon.io',
    url: SITE_URL,
    title: 'showon.io',
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'showon.io',
    description: SITE_DESCRIPTION,
  },
};

// Organization + WebSite schema for the whole site — shows the brand card and
// enables a sitelinks search box eligibility in Google.
const ORG_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'showon.io',
  url: SITE_URL,
  logo: `${SITE_URL}/showon-icon.svg`,
  description: SITE_DESCRIPTION,
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
        <link rel="icon" href="/showon-icon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body>
        <JsonLd data={ORG_JSON_LD} />
        <NextIntlClientProvider messages={messages}>
          <Providers
            initialIsLoggedIn={initialIsLoggedIn}
            initialUser={initialUser}
            dehydratedState={dehydrate(qc)}
          >
            {children}
            <ConsentBanner />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
