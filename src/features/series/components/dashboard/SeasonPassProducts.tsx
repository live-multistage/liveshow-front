'use client';

import { useTranslations } from 'next-intl';
import { EditTicketSection } from '@/features/events/components/dashboard/EditTicketSection';
import { useSeriesTicketProductsQuery } from '../../queries/series.queries';
import type { SeriesTicketProduct } from '../../types/series.types';
import styles from './SeasonPassProducts.module.scss';

interface Props {
  seriesId: string;
  // Stage checkboxes source from the template event's streams, same as the
  // "Configurar câmeras do modelo" link.
  templateEventId: string;
}

// EditTicketSection only reads/writes a common ticket-product shape; a
// season pass adds "sold" (a raw count) where an event ticket already
// carries the derived remaining/soldOut — compute those here instead of
// teaching EditTicketSection two different sold-out formulas.
function toDisplayItem(product: SeriesTicketProduct) {
  const remaining = product.capacity != null ? Math.max(0, product.capacity - product.sold) : null;
  const soldOut = product.capacity != null && product.sold >= product.capacity;
  // Season passes carry no stage restriction; the shared ticket editor still expects the field.
  return { ...product, allowedStageIds: [], remaining, soldOut };
}

export function SeasonPassProducts({ seriesId, templateEventId }: Props) {
  const t = useTranslations('series');
  const { data: products = [] } = useSeriesTicketProductsQuery(seriesId);

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>{t('dashboard.seasonPasses')}</h2>
      <EditTicketSection
        seriesId={seriesId}
        stagesEventId={templateEventId}
        tickets={products.map(toDisplayItem)}
      />
    </section>
  );
}
