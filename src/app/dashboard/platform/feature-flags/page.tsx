import { redirect } from 'next/navigation';

// Feature flags now live inside /dashboard/platform/settings — this route
// stays only so old links/bookmarks keep working.
export default function Page() {
  redirect('/dashboard/platform/settings#feature-flags');
}
