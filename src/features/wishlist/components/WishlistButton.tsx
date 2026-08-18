'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Heart } from 'lucide-react';
import { useAuth } from '@/features/account';
import { useWishlistIdsQuery } from '../queries/get-wishlist';
import { useToggleWishlistMutation } from '../mutations/toggle-wishlist.mutation';
import styles from './WishlistButton.module.scss';

interface WishlistButtonProps {
  eventId: string;
  variant?: 'overlay' | 'inline';
  className?: string;
}

export function WishlistButton({ eventId, variant = 'overlay', className }: WishlistButtonProps) {
  const t = useTranslations('wishlist');
  const router = useRouter();
  const pathname = usePathname();
  const { isLoggedIn } = useAuth();

  // Só busca os ids autenticado — visitante deslogado não deve disparar
  // uma request autenticada apenas para desenhar corações.
  const { data: ids } = useWishlistIdsQuery({ enabled: isLoggedIn });
  const toggleWishlist = useToggleWishlistMutation();

  const saved = ids?.includes(eventId) ?? false;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // O botão vive dentro do <Link> do card inteiro: sem isso o clique navega
    // para o evento em vez de favoritar.
    e.preventDefault();
    e.stopPropagation();

    if (!isLoggedIn) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    toggleWishlist.mutate({ eventId, saved });
  };

  return (
    <button
      type="button"
      className={[styles.button, styles[variant], className].filter(Boolean).join(' ')}
      onClick={handleClick}
      disabled={toggleWishlist.isPending}
      aria-pressed={saved}
      aria-label={saved ? t('removeAria') : t('saveAria')}
    >
      <Heart className={styles.icon} fill={saved ? 'currentColor' : 'none'} />
      {variant === 'inline' && <span className={styles.label}>{saved ? t('saved') : t('save')}</span>}
    </button>
  );
}
