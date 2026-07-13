import { redirect } from 'next/navigation';

// The account hub was unified into the redesigned settings screen.
export default function AccountPage() {
  redirect('/settings');
}
