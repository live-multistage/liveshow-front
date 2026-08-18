import type { Metadata } from 'next';
import { MyListPageContent } from '@/features/my-list';

export const metadata: Metadata = { title: 'Minha lista' };

export default function MyListPage() {
  return <MyListPageContent />;
}
