import type { OrganizationResponse } from '@live-show/api-contracts';

// TODO: swap for the `@live-show/api-contracts` exports of the same names once
// the backend ships them (GET /organizations/mine/paged and /mine/summary).

// owned = ownerId is the caller; invited = ownerId is someone else;
// archived = status ARCHIVED. Absent means every org, archived included.
export type MyOrganizationsFilter = 'owned' | 'invited' | 'archived';

export interface MyOrganizationsPageParams {
  page?: number;
  pageSize?: number;
  filter?: MyOrganizationsFilter;
  q?: string;
}

// Ordered by name ASC.
export interface MyOrganizationsPageResponse {
  items: OrganizationResponse[];
  page: number;
  pageSize: number;
  total: number;
}

// Over every org of the caller, ignoring filter and q.
export interface MyOrganizationsSummary {
  counts: Record<'all' | MyOrganizationsFilter, number>;
  totals: {
    activeEventsCount: number;
    memberCount: number;
    salesThisMonth: { currency: string; amount: number }[];
  };
}
