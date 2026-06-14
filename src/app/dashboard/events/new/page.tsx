import type { Metadata } from 'next';
import { CreateEventPageContent } from '@/features/events';

export const metadata: Metadata = { title: 'Novo evento' };

export default function CreateEventPage() {
  return <CreateEventPageContent />;
}
