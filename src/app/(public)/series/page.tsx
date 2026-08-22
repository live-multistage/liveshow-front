import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { fetchSeries } from '@/features/series/queries/get-series.server';
import { SeriesCard } from '@/features/series/components/SeriesCard';
import styles from './page.module.scss';

export const metadata: Metadata = { title: 'Séries' };

// Listagem pública de séries ativas. É o destino do "ver todos" do trilho
// da home e da saída da página de uma série.
export default async function SeriesListPage() {
  const [series, t, tCommon] = await Promise.all([
    fetchSeries(),
    getTranslations('series'),
    getTranslations('common'),
  ]);

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>{t('title')}</h1>

      {series.length === 0 ? (
        <p className={styles.empty}>{tCommon('notFound')}</p>
      ) : (
        <div className={styles.grid}>
          {series.map((item) => (
            <SeriesCard key={item.id} series={item} />
          ))}
        </div>
      )}
    </div>
  );
}
