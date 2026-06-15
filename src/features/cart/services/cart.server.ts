import { cookies } from 'next/headers';
import { config } from '@/config';
import type { CartView } from './cart.service';

// Server-side cart fetch for SSR (no layout shift). Forwards the access_token
// cookie (set on login) as a Bearer to the backend. Returns undefined when logged
// out or on any failure — the client query then takes over.
export async function fetchCartServer(): Promise<CartView | undefined> {
  const token = (await cookies()).get('access_token')?.value;
  if (!token) return undefined;
  try {
    const res = await fetch(`${config.apiUrl}/cart`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return undefined;
    return (await res.json()) as CartView;
  } catch {
    return undefined;
  }
}
