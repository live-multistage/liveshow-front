'use client';

/**
 * A stable name for "this buyer paying for this exact cart".
 *
 * Deliberately derived from the cart, never random: a random key per click
 * would only survive an automatic network retry, while the double charges that
 * actually happen come from a second click, a browser back out of Stripe, a
 * second tab, or a reload — all of which re-render with the same cart and so
 * must produce the same key. Change the cart and the key changes, which is
 * exactly when a new order is the right answer.
 *
 * The buyer is not part of the input: the server scopes the key by user id, so
 * two people with identical carts never collide.
 */
export async function cartIdempotencyKey(input: {
  ticketProductIds: string[];
  couponCode?: string | null;
  provider: string;
  flow?: string;
  method?: string;
}): Promise<string> {
  const canonical = [
    [...input.ticketProductIds].sort().join(','),
    input.couponCode ?? '',
    input.provider,
    input.flow ?? '',
    input.method ?? '',
  ].join('|');

  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(canonical),
  );
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
