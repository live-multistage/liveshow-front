'use client';

import { useMemo } from 'react';
import { useMyOrdersQuery } from '../queries/get-my-orders';
import { useListEventsQuery } from '@/features/events';
import { useAuth } from '@/features/account';
import type { PurchasedTicket } from '../types/ticket.types';

export function useTickets() {
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const { data: orders = [], isLoading: ordersLoading } = useMyOrdersQuery({
    enabled: isLoggedIn && !authLoading,
  });
  const { data: events = [], isLoading: eventsLoading } = useListEventsQuery('all');

  const tickets = useMemo<PurchasedTicket[]>(() => {
    const eventsById = Object.fromEntries(events.map((e) => [e.id, e]));
    console.log(orders)
    return orders
      .map((order) => {
        const event = eventsById[order.eventId];
        if (!event) return null;
        return {
          orderId: order.orderId,
          event,
          ticketProductName: order.ticketProductName,
          capabilities: order.capabilities,
          camerasLimit: order.camerasLimit,
          totalAmount: order.totalAmount,
          purchasedAt: order.createdAt,
        } satisfies PurchasedTicket;
      })
      .filter((t): t is PurchasedTicket => t !== null);
  }, [orders, events]);

  return {
    tickets,
    withReplay: tickets.filter((t) => t.capabilities.includes('REPLAY_VIEW')),
    withoutReplay: tickets.filter((t) => !t.capabilities.includes('REPLAY_VIEW')),
    withCamera: tickets.filter((t) => t.capabilities.includes('CAMERA_VIEW')),
    isLoading: authLoading || ordersLoading || eventsLoading,
  };
}
