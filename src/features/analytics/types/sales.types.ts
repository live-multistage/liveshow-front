export type SalesGranularity = 'day' | 'month';

export interface SalesDataPoint {
  date: string;
  orders: number;
  revenue: number;
}

export interface SalesSummary {
  totalOrders: number;
  totalRevenue: number;
  data: SalesDataPoint[];
}

// One chart line per event, on the same slots as summary.data.
export interface EventSalesSeries {
  eventId: string;
  eventTitle: string;
  data: SalesDataPoint[];
}

// No FX conversion — sales are reported per currency, never summed across.
export interface SalesByCurrency {
  currency: string;
  summary: SalesSummary;
  byEvent: EventSalesSeries[];
}

export interface EventSalesRow {
  eventId: string;
  eventTitle: string;
  currency: string;
  startsAt: string;
  venue: string | null;
  city: string | null;
  thumbnailUrl: string | null;
  totalOrders: number;
  totalRevenue: number;
}

export interface EventSalesResult {
  events: EventSalesRow[];
}
