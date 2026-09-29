import { notFound, redirect } from 'next/navigation';
import { config } from '@/config';

// Bridge route. Ad notifications are created by the backend, which only accepts
// internal paths as a notification link, but the ad detail screen lives in the
// Ads Manager on its own origin. This route is that link's destination and
// forwards to it.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // The id is interpolated into an external URL, so anything that isn't an id
  // shape is refused rather than forwarded.
  if (!/^[0-9a-fA-F-]{36}$/.test(id)) notFound();
  redirect(`${config.adsManagerUrl}/campaigns/${id}`);
}
