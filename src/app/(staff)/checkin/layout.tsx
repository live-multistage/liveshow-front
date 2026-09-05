import { requireFeatureFlag } from '@/features/feature-flags';

export default async function CheckinLayout({ children }: { children: React.ReactNode }) {
  await requireFeatureFlag('physical_tickets');
  return <>{children}</>;
}
