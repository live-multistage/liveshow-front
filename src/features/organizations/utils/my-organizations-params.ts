import type { ReadonlyURLSearchParams } from 'next/navigation';
import type { MyOrganizationsFilter } from '../types/organization.types';

export const MY_ORGANIZATIONS_TABS: MyOrganizationsFilter[] = ['owned', 'invited', 'archived'];
const MAX_QUERY_LENGTH = 120;

export interface MyOrganizationsUrlState {
  tab?: MyOrganizationsFilter;
  q?: string;
  page: number;
}

// Reads /dashboard/organizations?tab=&q=&page=. Unknown values fall back to
// the defaults (every org, no search, page 1) instead of reaching the API.
export function parseMyOrganizationsParams(sp: URLSearchParams | ReadonlyURLSearchParams): MyOrganizationsUrlState {
  const tabRaw = sp.get('tab');
  const tab = (MY_ORGANIZATIONS_TABS as string[]).includes(tabRaw ?? '')
    ? (tabRaw as MyOrganizationsFilter)
    : undefined;

  const qRaw = sp.get('q')?.trim();
  const q = qRaw && qRaw.length <= MAX_QUERY_LENGTH ? qRaw : undefined;

  const rawPage = Number(sp.get('page'));
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;

  const state: MyOrganizationsUrlState = { page };
  if (tab) state.tab = tab;
  if (q) state.q = q;
  return state;
}

export function hrefForMyOrganizations({ tab, q, page }: MyOrganizationsUrlState): string {
  const next = new URLSearchParams();
  if (tab) next.set('tab', tab);
  if (q) next.set('q', q);
  if (page > 1) next.set('page', String(page));
  const qs = next.toString();
  return qs ? `/dashboard/organizations?${qs}` : '/dashboard/organizations';
}
