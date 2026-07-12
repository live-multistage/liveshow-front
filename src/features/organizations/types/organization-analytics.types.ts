import type { SalesSummary } from '@/features/analytics/types/sales.types';
import type { ChartPoint } from '@/features/analytics/types/analytics.types';

export interface OrganizationAnalyticsFunnel {
  viewCount: number;
  uniqueViewCount: number;
  cartAddCount: number;
  purchaseCount: number;
  viewToCartRate: number | null;
  cartToPurchaseRate: number | null;
  avgWatchSeconds: number | null;
  completionRate: number | null;
}

export interface OrganizationAnalyticsCreatorScores {
  reputationScore: number;
  momentumScore: number;
  newFollowers: number;
  recentEventsCount: number;
  avgRetentionRate: number | null;
}

export interface OrganizationAnalyticsResponse {
  sales: SalesSummary;
  funnel: OrganizationAnalyticsFunnel;
  viewsSeries: ChartPoint[];
  creatorScores: OrganizationAnalyticsCreatorScores;
}
