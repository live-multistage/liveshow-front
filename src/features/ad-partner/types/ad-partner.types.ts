export type AdPartnershipStatus =
  | 'NOT_ELIGIBLE' | 'ELIGIBLE' | 'APPLIED' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export interface PartnerMetricsSnapshot {
  liveViews: number;
  payingBuyers: number;
  windowDays: number;
  capturedAt: string;
}

export interface AdPartnerEarning {
  day: string;
  amount: number;
  currency: string;
  grossCents: number;
  rate: number;
}

export interface AdPartnerDashboard {
  liveViews: number;
  payingBuyers: number;
  thresholds: { minLiveViews: number; minPayingBuyers: number };
  windowDays: number;
  eligible: boolean;
  connectReady: boolean;
  status: AdPartnershipStatus;
  revenueShareRate: number;
  reviewNote: string | null;
  earnings: AdPartnerEarning[];
}

export interface AdPartnershipRow {
  id: string;
  organizationId: string;
  status: AdPartnershipStatus;
  revenueShareRate: number | null;
  metricsSnapshot: PartnerMetricsSnapshot | null;
  appliedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewNote: string | null;
}
