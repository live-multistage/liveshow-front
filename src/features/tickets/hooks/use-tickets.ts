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
  // silently for events outside its first page). One order can carry
  // several lines (several ticket products bought in the same checkout);
  // each line with an event becomes its own ticket card.
  const tickets = useMemo<PurchasedTicket[]>(
    () =>
      orders.flatMap((order) =>
        order.lines
          .filter((line) => line.event !== null)
          .map(
            (line) =>
              ({
                orderId: order.id,
                orderLineId: line.id,
                event: line.event!,
                ticketProductName: line.productName,
                capabilities: line.capabilities,
                camerasLimit: line.camerasLimit,
                totalAmount: line.lineTotal,
                purchasedAt: order.createdAt,
              }) satisfies PurchasedTicket,
          ),
      ),
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
