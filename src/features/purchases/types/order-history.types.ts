export interface OrderHistoryItem {
  orderId: string;
  code: string;
  eventId: string;
  eventTitle: string;
  eventVenue: string | null;
  eventStartsAt: string | null;
  ticketProductName: string;
  status: string; // PAID | REFUNDED | PENDING | CANCELLED
  totalAmount: number;
  createdAt: string;
}
