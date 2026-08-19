import { redirect } from 'next/navigation';

export default function PlatformAdminIndexPage() {
  redirect('/dashboard/platform/organizations');
}
