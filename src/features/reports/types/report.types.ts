export type ReportTarget = 'EVENT';

export type ReportReason =
  | 'INAPPROPRIATE'
  | 'VIOLENCE'
  | 'HATE'
  | 'SEXUAL'
  | 'HARASSMENT'
  | 'SPAM_MISLEADING'
  | 'ILLEGAL'
  | 'COPYRIGHT'
  | 'OTHER';

export interface SubmitReportInput {
  targetType: ReportTarget;
  targetId: string;
  reason: ReportReason;
  detail?: string;
  reporterKey?: string;
}

export interface SubmitReportResponse {
  id: string;
}
