export interface NotificationBreakdownRow {
  notificationType: string;
  deliveredCount: number;
  clickedCount: number;
  clickRate: number | null;
}
