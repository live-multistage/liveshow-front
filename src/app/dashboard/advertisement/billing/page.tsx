import { redirect } from 'next/navigation';
import { config } from '@/config';

// Sibling of [id]: the destination for wallet notifications (low balance),
// which are account-level and carry no ad id. A static segment wins over the
// dynamic one, so this never reaches the id route.
export default function Page() {
  redirect(`${config.adsManagerUrl}/billing`);
}
