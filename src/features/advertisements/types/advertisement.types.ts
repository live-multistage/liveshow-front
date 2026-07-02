export type AdStatus = 'DRAFT' | 'REVIEW' | 'ACTIVE' | 'PAUSED' | 'ENDED';
export type AdFormat = 'HORIZONTAL_728x90' | 'VERTICAL_300x600';
export type AdPlacement = 'FEED' | 'EVENT_DETAIL' | 'CHECKOUT' | 'POST_PURCHASE';
export type AdBillingModel = 'CPM' | 'CPC';
export type AdStatusAction = 'submit' | 'activate' | 'pause' | 'end';
export type FrequencyCapWindow = 'day' | 'total';

export interface AdResponse {
  id: string;
  organizationId: string;
  eventId: string | null;
  title: string;
  format: AdFormat;
  status: AdStatus;
  placements: AdPlacement[];
  targetDomains: string[];
  targetCategories: string[];
  bannerUrl: string | null;
  frequencyCapMax: number | null;
  frequencyCapWindow: FrequencyCapWindow | null;
  billingModel: AdBillingModel;
  bidCents: number;
  dailyBudgetCents: number;
  totalLimitCents: number;
  totalSpendCents: number;
  startsAt: string;
  endsAt: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdRequest {
  organizationId: string;
  eventId?: string;
  title: string;
  format: AdFormat;
  placements: AdPlacement[];
  targetDomains: string[];
  targetCategories: string[];
  frequencyCapMax?: number;
  frequencyCapWindow?: FrequencyCapWindow;
  billingModel: AdBillingModel;
  bidCents: number;
  dailyBudgetCents: number;
  totalLimitCents: number;
  startsAt: string;
  endsAt: string;
}

export interface UpdateAdRequest {
  title?: string;
  format?: AdFormat;
  placements?: AdPlacement[];
  targetDomains?: string[];
  targetCategories?: string[];
  frequencyCapMax?: number;
  frequencyCapWindow?: FrequencyCapWindow;
  billingModel?: AdBillingModel;
  bidCents?: number;
  dailyBudgetCents?: number;
  totalLimitCents?: number;
  startsAt?: string;
  endsAt?: string;
}

export interface ChangeAdStatusRequest {
  action: AdStatusAction;
}

export interface AdDailyBreakdown {
  date: string;
  impressions: number;
  clicks: number;
  spendCents: number;
}

export interface AdReportResponse {
  adId: string;
  title: string;
  status: string;
  impressions: number;
  clicks: number;
  ctr: number | null;
  spendCents: number;
  dailyBreakdown: AdDailyBreakdown[];
}

export interface ServedAd {
  adId: string;
  title: string;
  format: string;
  organizationId: string;
  eventId: string | null;
  bannerUrl: string | null;
}
