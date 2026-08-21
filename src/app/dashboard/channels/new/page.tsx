import type { Metadata } from 'next';
import { ChannelForm } from '@/features/channels/components/dashboard/ChannelForm';

export const metadata: Metadata = { title: 'Novo canal' };

export default function CreateChannelPage() {
  return <ChannelForm />;
}
