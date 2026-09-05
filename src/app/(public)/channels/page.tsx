import type { Metadata } from 'next';
import { fetchChannels } from '@/features/channels/queries/get-channels.server';
import { ChannelsBrowser } from '@/features/channels/components/ChannelsBrowser';
import styles from './page.module.scss';

const TITLE = 'Canais';
const DESCRIPTION = 'Canais 24h ao vivo — programação contínua de shows e eventos no showon.io.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/channels' },
  openGraph: { type: 'website', url: '/channels', title: TITLE, description: DESCRIPTION },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

// Listagem pública de canais publicados. É o destino do "ver todos" do trilho
// da home e da saída do player de canal. SSR busca o catálogo; o filtro/busca
// vive num shell client (ChannelsBrowser).
export default async function ChannelsPage() {
  const channels = await fetchChannels();

  return (
    <div className={styles.page}>
      <ChannelsBrowser channels={channels} />
    </div>
  );
}
