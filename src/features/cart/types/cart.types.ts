import type { AccessCapability } from '@/features/events';

export interface CartItem {
  eventId: string;
  eventTitle: string;
  ticketProductId: string;
  ticketName: string;
  price: number;
  capabilities: AccessCapability[];
  camerasLimit: number | null;
}
