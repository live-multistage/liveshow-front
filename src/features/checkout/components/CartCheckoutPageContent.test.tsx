import { describe, it, expect, vi } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

import { placeOrderSchema } from '@live-show/api-contracts';

describe('web order provider', () => {
  // The browser has no Play Billing and no way to complete a PLAY_BILLING
  // action. Widening the contract for the app must not make it POSSIBLE for
  // the web to ask for one.
  it('the schema still rejects everything outside the two-member choice', () => {
    expect(placeOrderSchema.safeParse({ provider: 'STRIPE' }).success).toBe(true);
    expect(placeOrderSchema.safeParse({ provider: 'PIX' }).success).toBe(false);
    expect(placeOrderSchema.safeParse({ provider: 'PAYPAL' }).success).toBe(false);
  });

  it('the checkout page sends STRIPE, verbatim', async () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const source = await import('node:fs').then((fs) =>
      fs.readFileSync(
        join(__dirname, './CartCheckoutPageContent.tsx'),
        'utf8',
      ),
    );
    // A literal, asserted as source text, because the mutation is fired deep
    // inside a component that needs the whole app shell to render. If this
    // ever becomes a variable, this test is the reminder to gate it.
    expect(source).toContain("provider: 'STRIPE'");
    expect(source).not.toContain("provider: 'GOOGLE_PLAY'");
  });
});
