import type { AccessCapability } from '@/features/events';

export interface CartItem {
  eventId: string;
  eventTitle: string;
  ticketProductId: string;
  ticketName: string;
  price: number;
  capabilities: AccessCapability[];
  camerasLimit: number | null;
  // Optional presentation fields for the cart UI.
  eventImage?: string | null;
  organizerName?: string | null;
}
