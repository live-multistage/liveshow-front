import type { AbstractIntlMessages } from 'next-intl';

// Namespaces only client components under (stream), (user) and dashboard read,
// plus aboutPage (server-only via getTranslations). The root layout leaves
// them out of the client provider because it serializes its messages into
// every page's HTML (~60% of the home document); those three layouts re-wrap
// their subtree in a bare <NextIntlClientProvider>, which inherits all
// messages. A namespace a client component outside those layouts needs must
// not be listed here, or it renders raw keys.
export const ROUTE_SCOPED_NAMESPACES = [
  'platformAdmin',
  'dashboard',
  'controlRoom',
  'chat',
  'liveGate',
  'player',
  'replaySoon',
  'purchases',
  'ticketCard',
  'ticketList',
  'tickets',
  'aboutPage',
] as const;

export function omitRouteScopedMessages(messages: AbstractIntlMessages): AbstractIntlMessages {
  const scoped = new Set<string>(ROUTE_SCOPED_NAMESPACES);
  return Object.fromEntries(Object.entries(messages).filter(([namespace]) => !scoped.has(namespace)));
}
