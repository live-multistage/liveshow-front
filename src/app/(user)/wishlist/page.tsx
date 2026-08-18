import type { Metadata } from 'next';
import { WishlistPageContent } from '@/features/wishlist/components/WishlistPageContent';

export const metadata: Metadata = { title: 'Favoritos' };

export default function WishlistPage() {
  return <WishlistPageContent />;
}
