import { describe, it, expect, vi } from 'vitest';

vi.mock('@/features/checkout', () => ({
  CheckoutPageContent: ({ ticketProductId }: { ticketProductId: string }) => (
    <div data-testid="checkout">{ticketProductId}</div>
  ),
}));

import { render, screen } from '@testing-library/react';
import CheckoutPage from './page';

describe('/events/[id]/checkout', () => {
  // The checkout page itself is a shim into the cart flow — it no longer
  // resolves the event id, it just forwards ticketId. The success/pending/
  // failed outcome pages under this segment are gone: the cart flow owns the
  // outcome screens under /checkout.
  it('forwards the ticketId search param to CheckoutPageContent', async () => {
    render(
      await CheckoutPage({
        searchParams: Promise.resolve({ ticketId: 'tp-1' }),
      }),
    );

    expect(screen.getByTestId('checkout')).toHaveTextContent('tp-1');
  });
});
