import { eventHref } from '@/features/events/utils/slug';
import { formatDateShort } from '@/features/events/utils/event-formatters';
import { EventSkeleton, Notice, Placeholder } from './EventCards';
import type { ElementView } from './types';
import { cx } from './types';
import styles from './elements.module.scss';

export const FeaturedEvent: ElementView<'featuredEvent'> = ({ props, common, ctx }) => {
  const e = ctx.resolved.featured[props.id];
  if (!e) {
    if (ctx.mode === 'public') return null;
    if (ctx.loading?.includes(props.id)) return <EventSkeleton count={1} className={common.className} />;
    if (e === null) {
      return <Notice tone="error" title="Evento indisponível" text="Foi cancelado ou deixou de ser público. Na página publicada este bloco não aparece." />;
    }
    return <Placeholder>Evento em destaque</Placeholder>;
  }
  return (
    <div id={common.id} className={cx(styles.featured, common.className)}>
      <span className={styles.featuredArt}>
        {/* eslint-disable-next-line @next/next/no-img-element -- poster hosts are not in next/image remotePatterns */}
        {e.posterUrl && <img src={e.posterUrl} alt="" />}
      </span>
      <div className={styles.featuredBody}>
        {e.startsAt && <span className={styles.eventDate}>{formatDateShort(e.startsAt)}</span>}
        {e.isLive && <span className={styles.liveBadge}>AO VIVO</span>}
        <h2 className={styles.featuredTitle}>{e.title}</h2>
        <a href={eventHref(e)} className={styles.featuredCta}>{props.ctaLabel || 'Comprar ingresso'}</a>
      </div>
    </div>
  );
};
