import { cookies } from 'next/headers';
import type { HomeRailsResponse } from '@live-show/api-contracts';
import { withRequestId } from '@/lib/http/request-id';

const apiBase = () =>
  (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api').replace(/\/$/, '');

// First page of the home rails feed, seeded for SSR. Forwards the
// `access_token` cookie as a Bearer header when present so a logged-in
// visitor's first paint is already personalized — and skips the Data Cache
// for them (`no-store`) since the response differs per user. An anonymous
// visitor gets the shared public response, cached for 30s like the rest of
// the home feed fetches (see get-feed.server.ts). Returns null on any
// failure — the client query below fetches its own copy either way.
export async function fetchHomeRails(): Promise<HomeRailsResponse | null> {
  try {
    const token = (await cookies()).get('access_token')?.value;
    const init = token
      ? withRequestId({ headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      // ponytail: withRequestId forbids cache: 'no-store' !== undefined fetches
      // (a random header defeats Next's Data Cache key, see request-id.ts) —
      // this branch is the shared, cached (revalidate 30s) anonymous response,
      // so it deliberately stays without a request id.
      : { next: { revalidate: 30 } };
    const res = await fetch(`${apiBase()}/home/rails?limit=4`, init);
    if (!res.ok) return null;
    return (await res.json()) as HomeRailsResponse;
  } catch {
    return null;
  }
}
