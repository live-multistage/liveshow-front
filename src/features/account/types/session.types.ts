export interface SessionView {
  id: string;
  device: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastUsedAt: string;
  current: boolean;
}
