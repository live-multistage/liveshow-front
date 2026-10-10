import type { Metadata } from 'next';
import { Archivo, Space_Mono } from 'next/font/google';
import { cookies } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';
import { QueryClient, dehydrate } from '@tanstack/react-query';
import { Providers } from '@/providers';
import { getInitialIsLoggedIn, getUserServer, checkAuthServer } from '@/features/account/queries/get-auth-state.server';
import { ConsentBanner } from '@/features/consent';
import { omitRouteScopedMessages } from '@/i18n/client-messages';
import { JsonLd } from '@/shared/components/JsonLd';
import { ErrorReportingProvider } from '@/lib/error-reporting/error-reporting-provider';
import { getSeoGlobal } from '@/features/seo/queries/get-seo.server';
import { buildRootMetadata, SITE_DESCRIPTION } from '@/features/seo/utils/root-metadata';
import { resolveGlobalJsonLd } from '@/features/seo/utils/resolve-global-jsonld';
import '@/styles/globals.scss';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://showon.io';
// Client queries (feed, ads, schedule) hit the API origin right after hydration;
// warming the connection early takes DNS/TLS off that path. Anonymous pool
// because the http client sends CORS requests without credentials.
const API_ORIGIN = new URL(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api').origin;

const archivo = Archivo({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-archivo',
  display: 'swap',
});

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-space-mono',
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  return buildRootMetadata(await getSeoGlobal());
}

// Organization + WebSite schema for the whole site — shows the brand card and
// establishes the canonical site identity in Google's knowledge graph.
const ORG_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'showon.io',
  url: SITE_URL,
  logo: `${SITE_URL}/showon-icon.svg`,
  description: SITE_DESCRIPTION,
};

const WEBSITE_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'showon.io',
  url: SITE_URL,
  inLanguage: 'pt-BR',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  const seoGlobal = await getSeoGlobal();

  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value;
  // Cookie mirror of the analytics consent choice (see src/lib/analytics/consent.ts).
  const consentUndecided = !cookieStore.has('ls_analytics_consent');
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
    <html lang={locale} className={`dark ${archivo.variable} ${spaceMono.variable}`}>
      <head>
        <link rel="icon" href="/showon-icon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="preconnect" href={API_ORIGIN} crossOrigin="anonymous" />
      </head>
      <body>
        <JsonLd data={resolveGlobalJsonLd(seoGlobal, { organization: ORG_JSON_LD, website: WEBSITE_JSON_LD })} />
        <NextIntlClientProvider messages={omitRouteScopedMessages(messages)}>
          <ErrorReportingProvider>
            <Providers
              initialIsLoggedIn={initialIsLoggedIn}
              initialUser={initialUser}
              dehydratedState={dehydrate(qc)}
            >
              {children}
              <ConsentBanner undecidedOnServer={consentUndecided} />
            </Providers>
          </ErrorReportingProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
