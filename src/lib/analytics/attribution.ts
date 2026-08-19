export type SalesChannel = 'DIRECT' | 'ORGANIC_SEARCH' | 'RECOMMENDATION' | 'NOTIFICATION' | 'OTHER';

export interface CapturedAttribution {
  channel: SalesChannel;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  referrerHost: string | null;
}

const ATTRIBUTION_KEY = 'ls_attribution';
const SEARCH_ENGINE_HOSTS = ['google.', 'bing.', 'yahoo.', 'duckduckgo.', 'baidu.'];

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

// ponytail: no full utm_medium taxonomy (social/email/paid-search buckets) —
// only 5 channels exist today, matching what the dashboard mock draws.
// Expand this when real campaign data shows a need for finer buckets.
function classifyChannel(params: {
  utmSource: string | null;
  utmMedium: string | null;
  referrerHost: string | null;
}): SalesChannel {
  const { utmSource, utmMedium, referrerHost } = params;

  if (utmSource || utmMedium) {
    return utmMedium === 'notification' || utmMedium === 'push' ? 'NOTIFICATION' : 'OTHER';
  }
  if (!referrerHost) return 'DIRECT';
  if (SEARCH_ENGINE_HOSTS.some((engine) => referrerHost.includes(engine))) return 'ORGANIC_SEARCH';
  if (typeof window !== 'undefined' && referrerHost === window.location.hostname) return 'RECOMMENDATION';
  return 'OTHER';
}

export function captureAttribution(): void {
  if (typeof window === 'undefined') return;
  try {
    if (sessionStorage.getItem(ATTRIBUTION_KEY)) return; // first touch of this session already captured

    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get('utm_source');
    const utmMedium = params.get('utm_medium');
    const utmCampaign = params.get('utm_campaign');
    const referrerHost = document.referrer ? hostnameOf(document.referrer) : null;

    const attribution: CapturedAttribution = {
      channel: classifyChannel({ utmSource, utmMedium, referrerHost }),
      utmSource,
      utmMedium,
      utmCampaign,
      referrerHost,
    };
    sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
  } catch {
    // sessionStorage unavailable (locked-down browser, etc.) — never block the page for this
  }
}

export function getAttribution(): CapturedAttribution | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(ATTRIBUTION_KEY);
    return raw ? (JSON.parse(raw) as CapturedAttribution) : null;
  } catch {
    return null;
  }
}
