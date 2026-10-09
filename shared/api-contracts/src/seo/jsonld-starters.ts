import type { SeoPageKey } from './page-keys';

const CTX = 'https://schema.org';

const webPage = {
  '@context': CTX,
  '@type': 'WebPage',
  name: '{{site.name}}',
  url: '{{site.url}}',
  inLanguage: 'pt-BR',
};

const collectionPage = { '@context': CTX, '@type': 'CollectionPage', name: '{{site.name}}', url: '{{site.url}}' };

function crumbs(...items: [name: string, item: string][]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, item], i) => ({ '@type': 'ListItem', position: i + 1, name, item })),
  };
}

const home: [string, string] = ['Home', '{{site.url}}'];

const eventsDetail = {
  '@context': CTX,
  '@graph': [
    {
      '@type': 'Event',
      name: '{{event.name}}',
      description: '{{event.description}}',
      startDate: '{{event.startsAt}}',
      endDate: '{{event.endsAt}}',
      image: '{{event.imageUrl}}',
      url: '{{event.url}}',
      eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
      organizer: { '@type': 'Organization', name: '{{organization.name}}' },
      performer: { '@type': 'Person', name: '{{artist.name}}' },
      offers: { '@type': 'AggregateOffer', lowPrice: '{{event.priceFrom}}', priceCurrency: 'BRL', url: '{{event.url}}' },
    },
    crumbs(home, ['Eventos', '{{site.url}}/events'], ['{{event.name}}', '{{event.url}}']),
  ],
};

const artistsDetail = {
  '@context': CTX,
  '@graph': [
    { '@type': 'Person', name: '{{artist.name}}', description: '{{artist.bio}}', image: '{{artist.imageUrl}}', url: '{{artist.url}}' },
    crumbs(home, ['Artistas', '{{site.url}}/artists'], ['{{artist.name}}', '{{artist.url}}']),
  ],
};

const organizationsDetail = {
  '@context': CTX,
  '@graph': [
    {
      '@type': 'Organization',
      name: '{{organization.name}}',
      description: '{{organization.description}}',
      logo: '{{organization.logoUrl}}',
      url: '{{organization.url}}',
    },
    crumbs(home, ['{{organization.name}}', '{{organization.url}}']),
  ],
};

const channelsDetail = {
  '@context': CTX,
  '@graph': [
    { '@type': 'BroadcastService', name: '{{channel.name}}', description: '{{channel.description}}', image: '{{channel.imageUrl}}', url: '{{channel.url}}' },
    crumbs(home, ['Canais', '{{site.url}}/channels'], ['{{channel.name}}', '{{channel.url}}']),
  ],
};

const pretty = (o: object) => JSON.stringify(o, null, 2);

// Editable starting points the admin can insert; every placeholder is allowed for its page key.
export const JSONLD_STARTERS: Record<SeoPageKey, string> = {
  home: pretty(webPage),
  'events.list': pretty(collectionPage),
  'events.detail': pretty(eventsDetail),
  'artists.list': pretty(collectionPage),
  'artists.detail': pretty(artistsDetail),
  'artists.apply': pretty(webPage),
  'organizations.detail': pretty(organizationsDetail),
  'channels.list': pretty(collectionPage),
  'channels.detail': pretty(channelsDetail),
  about: pretty(webPage),
  help: pretty(webPage),
  'be-partner': pretty(webPage),
  'be-partner.apply': pretty(webPage),
  'be-advertiser': pretty(webPage),
  'legal.privacy': pretty(webPage),
  'legal.terms': pretty(webPage),
};
