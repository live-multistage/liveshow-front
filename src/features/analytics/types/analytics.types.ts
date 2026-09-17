export interface EventMetricsFunnel {
  impressionCount: number;
  viewCount: number;
  uniqueViewCount: number;
  cartAddCount: number;
  checkoutCount: number;
  purchaseCount: number;
  viewToCartRate: number | null;
  cartToPurchaseRate: number | null;
  avgWatchSeconds: number | null;
  completionRate: number | null;
  cameraSwitchCount: number;
}

export interface ChartPoint {
  /**
   * ISO instant of the 30-minute bucket. Was `hour` holding a bare "HH:MI",
   * which is why a multi-day series looked shuffled: 03h, 16h, 23h, 17h are
   * four different days rendered with the date thrown away.
   */
  at: string;
  viewers: number;
  newAccesses: number;
}

export interface WindowedMetrics {
  viewCount: number;
  purchaseCount: number;
  avgWatchSeconds: number | null;
}

export interface EventMetricsResult {
  eventId: string;
  funnel: EventMetricsFunnel;
  chart: ChartPoint[];
  peakViewers: number;
  peakAt: string | null;
  currentWindow: WindowedMetrics | null;
  previousWindow: WindowedMetrics | null;
}
