'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAddToCartMutation } from '@/features/cart';

interface Props {
  ticketProductId: string;
}

// The "single ticket" checkout entry point (event page's Buy button) is now
// just a shortcut into the cart flow: add the item then hand off to
// /checkout. A currency-mismatch 409 or an already-in-cart 409 both still
// land on /checkout with whatever the cart already holds — the mutation's
// own error toast covers the mismatch case, nothing extra to do here.
export function CheckoutPageContent({ ticketProductId }: Props) {
  const router = useRouter();
  const addToCart = useAddToCartMutation();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current || !ticketProductId) return;
    fired.current = true;
    addToCart.mutate(ticketProductId, {
      onSettled: () => router.replace('/checkout'),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketProductId]);

  return null;
}
