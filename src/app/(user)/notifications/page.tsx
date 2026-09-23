import { redirect } from 'next/navigation';

// Moved into the account settings screen — see (user)/account/notifications.
export default function NotificationsPage() {
  redirect('/account/notifications');
}
