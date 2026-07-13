import type { Metadata } from 'next';
import { SettingsPageContent } from '@/features/account';
import { fetchFeatureFlags } from '@/features/feature-flags';

export const metadata: Metadata = { title: 'Configurações' };

// Server component: flag resolution stays server-side, passed to the client
// screen as a plain prop.
export default async function SettingsPage() {
  const flags = await fetchFeatureFlags();
  return <SettingsPageContent twoFactorEnabled={flags.two_factor} />;
}
