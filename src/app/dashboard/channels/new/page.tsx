import type { Metadata } from 'next';
import { CreateChannelForm } from '@/features/channels/components/dashboard/CreateChannelForm';

export const metadata: Metadata = { title: 'Novo canal' };

export default function CreateChannelPage() {
  return <CreateChannelForm />;
}
