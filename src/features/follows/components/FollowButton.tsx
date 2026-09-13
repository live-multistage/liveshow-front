'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Heart } from 'lucide-react';
import { Button } from '@live-show/design-system';
import type { FollowTargetType } from '@live-show/api-contracts';
import { useAuth } from '@/features/account';
import { useFollowCountQuery, useFollowIdsQuery } from '../queries/get-follows';
import { useToggleFollowMutation } from '../mutations/toggle-follow.mutation';
import styles from './FollowButton.module.scss';

interface FollowButtonProps {
  targetType: FollowTargetType;
  targetId: string;
  /** Renders the public follower count next to the button. */
  showCount?: boolean;
  className?: string;
}

export function FollowButton({ targetType, targetId, showCount = false, className }: FollowButtonProps) {
  const t = useTranslations('follows');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const { isLoggedIn } = useAuth();

  // Same rationale as WishlistButton: only fetch the authenticated ids list
  // when logged in, so a visitor doesn't fire an authenticated request just
  // to know whether to draw the heart filled.
  const { data: ids } = useFollowIdsQuery(targetType, { enabled: isLoggedIn });
  const { data: count } = useFollowCountQuery(targetType, targetId, { enabled: showCount });
  const toggleFollow = useToggleFollowMutation();

  const following = ids?.includes(targetId) ?? false;

  const handleClick = () => {
    if (!isLoggedIn) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    toggleFollow.mutate(
      { targetType, targetId, following },
      { onError: () => toast.error(tCommon('error')) },
    );
  };

  const label = !isLoggedIn ? t('loginToFollow') : following ? t('following') : t('follow');

  return (
    <div className={[styles.wrapper, className].filter(Boolean).join(' ')}>
      <Button
        type="button"
        variant={following ? 'outline' : 'default'}
        size="sm"
        onClick={handleClick}
        disabled={toggleFollow.isPending}
        {...(isLoggedIn ? { 'aria-pressed': following } : {})}
      >
        <Heart size={15} fill={following ? 'currentColor' : 'none'} aria-hidden="true" />
        {label}
      </Button>
      {showCount && count !== undefined && (
        <span className={styles.count}>{t('followersCount', { count })}</span>
      )}
    </div>
  );
}
