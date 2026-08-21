import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { ChannelListItem } from '../types/channel.types';
import styles from './ChannelCard.module.scss';

interface Props {
  channel: ChannelListItem;
}

// Cartão de canal do catálogo público (trilho da home e listagem /channels).
// Server component: só lê props e traduções, nada de estado.
export function ChannelCard({ channel }: Props) {
  const t = useTranslations('channels');

  return (
    <Link href={`/channels/${channel.slug}`} className={styles.card}>
      <div className={styles.cover}>
        {channel.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={channel.coverUrl} alt="" className={styles.coverImage} />
        ) : (
          <div className={styles.coverFallback} aria-hidden="true">
            {channel.name.charAt(0)}
          </div>
        )}

        {channel.isOnAir && (
          <span className={styles.onAir}>
            <span className={styles.onAirDot} />
            {t('onAir')}
          </span>
        )}
      </div>

      <div className={styles.body}>
        <p className={styles.name}>{channel.name}</p>
        {channel.isOnAir && channel.current && (
          <p className={styles.current}>
            <span className={styles.currentLabel}>{t('now')}</span>
            {channel.current.name}
          </p>
        )}
      </div>
    </Link>
  );
}
