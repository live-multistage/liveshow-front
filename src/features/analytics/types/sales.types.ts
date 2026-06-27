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

export interface EventSalesRow {
  eventId: string;
  eventTitle: string;
  totalOrders: number;
  totalRevenue: number;
}

export interface EventSalesResult {
  events: EventSalesRow[];
}
