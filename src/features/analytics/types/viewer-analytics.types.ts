export interface ViewerAnalyticsResult {
  eventId: string;
  currentViewers: number;
  totalViews: number;
  peakViewers: number;
  peakAt: string | null;
  avgDurationSeconds: number;
  hourlyBreakdown: Array<{ hour: string; viewers: number }>;
}
