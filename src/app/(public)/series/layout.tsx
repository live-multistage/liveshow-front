import { requireFeatureFlag } from '@/features/feature-flags';

export default async function SeriesLayout({ children }: { children: React.ReactNode }) {
  await requireFeatureFlag('linear_channels');
  return <>{children}</>;
}
