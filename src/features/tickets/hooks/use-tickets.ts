'use client';

import { useMemo } from 'react';
import { useMyOrdersQuery } from '../queries/get-my-orders';
import { useAuth } from '@/features/account';
import type { PurchasedTicket } from '../types/ticket.types';

export function useTickets() {
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const { data: orders = [], isLoading: ordersLoading } = useMyOrdersQuery({
    enabled: isLoggedIn && !authLoading,
  });

  // Event data comes embedded in /orders/mine — no join against the public
  // catalog (which is paginated and status-filtered; tickets used to vanish
  // silently for events outside its first page).
  const tickets = useMemo<PurchasedTicket[]>(
    () =>
      orders
        .map((order) =>
          order.event
            ? ({
                orderId: order.orderId,
                event: order.event,
                ticketProductName: order.ticketProductName,
                capabilities: order.capabilities,
                camerasLimit: order.camerasLimit,
                totalAmount: order.totalAmount,
                purchasedAt: order.createdAt,
              } satisfies PurchasedTicket)
            : null,
        )
        .filter((t): t is PurchasedTicket => t !== null),
    [orders],
  );

  return {
    tickets,
    withReplay: tickets.filter((t) => t.capabilities.includes('REPLAY_VIEW')),
    withoutReplay: tickets.filter((t) => !t.capabilities.includes('REPLAY_VIEW')),
    withCamera: tickets.filter((t) => t.capabilities.includes('CAMERA_VIEW')),
    isLoading: authLoading || ordersLoading,
  };
}
