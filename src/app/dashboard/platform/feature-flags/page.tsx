import type { Metadata } from 'next';
import { PlatformFeatureFlagsPage } from '@/features/platform-admin';

export const metadata: Metadata = { title: 'Plataforma — Feature Flags' };

export default function Page() {
  return <PlatformFeatureFlagsPage />;
}
