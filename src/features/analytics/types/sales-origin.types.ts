export type SalesChannel = 'DIRECT' | 'ORGANIC_SEARCH' | 'RECOMMENDATION' | 'NOTIFICATION' | 'OTHER';

export interface SalesOriginRow {
  channel: SalesChannel;
  count: number;
  pct: number;
}

export interface SalesOriginResult {
  eventId: string;
  totalPaidOrders: number;
  breakdown: SalesOriginRow[];
}
