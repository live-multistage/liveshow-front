export interface EventMetricsFunnel {
  viewCount: number;
  uniqueViewCount: number;
  cartAddCount: number;
  purchaseCount: number;
  viewToCartRate: number | null;
  cartToPurchaseRate: number | null;
  avgWatchSeconds: number | null;
  completionRate: number | null;
  cameraSwitchCount: number;
}

export interface ChartPoint {
  hour: string;
  viewers: number;
  newAccesses: number;
}

export interface EventMetricsResult {
  eventId: string;
  funnel: EventMetricsFunnel;
  chart: ChartPoint[];
  peakViewers: number;
  peakHour: string | null;
}
