import type { Metadata } from 'next';
import { EntryPassPageContent } from '@/features/tickets/components/EntryPassPageContent';

export const metadata: Metadata = { title: 'Ingresso presencial' };

// Own (pass) route group — no navbar, so window.print() emits just the pass.
export default function EntryPassPage() {
  return <EntryPassPageContent />;
}
