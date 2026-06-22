import type { Metadata } from 'next';
import { SettingsPageContent } from '@/features/account';

export const metadata: Metadata = { title: 'Configurações' };

export default function SettingsPage() {
  return <SettingsPageContent />;
}
