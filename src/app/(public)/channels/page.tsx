import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { fetchChannels } from '@/features/channels/queries/get-channels.server';
import { ChannelCard } from '@/features/channels/components/ChannelCard';
import styles from './page.module.scss';

export const metadata: Metadata = {
  title: 'Canais',
  description: 'Canais 24h ao vivo — programação contínua de shows e eventos no showon.io.',
  alternates: { canonical: '/channels' },
};

// Listagem pública de canais publicados. É o destino do "ver todos" do trilho
// da home e da saída do player de canal.
export default async function ChannelsPage() {
  const [channels, t, tCommon] = await Promise.all([
    fetchChannels(),
    getTranslations('channels'),
    getTranslations('common'),
  ]);

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>{t('title')}</h1>

      {channels.length === 0 ? (
        <p className={styles.empty}>{tCommon('notFound')}</p>
      ) : (
        <div className={styles.grid}>
          {channels.map((channel) => (
            <ChannelCard key={channel.id} channel={channel} />
          ))}
        </div>
      )}
    </div>
  );
}
