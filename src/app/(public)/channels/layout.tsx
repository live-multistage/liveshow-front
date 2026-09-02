import { requireFeatureFlag } from '@/features/feature-flags';

export default async function ChannelsLayout({ children }: { children: React.ReactNode }) {
  await requireFeatureFlag('linear_channels');
  return <>{children}</>;
}
