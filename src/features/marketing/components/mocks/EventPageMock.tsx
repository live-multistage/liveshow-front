import { ArrowRight } from 'lucide-react';
import styles from './EventPageMock.module.scss';

interface EventPageMockProps {
  live: string;
  title: string;
  date: string;
  venue: string;
  digitalLabel: string;
  physicalLabel: string;
  digitalSub: string;
  physicalSub: string;
  buy: string;
  organizer: string;
}

export function EventPageMock({
  live,
  title,
  date,
  venue,
  digitalLabel,
  physicalLabel,
  digitalSub,
  physicalSub,
  buy,
  organizer,
}: EventPageMockProps) {
  return (
    <div className={styles.card}>
      <div className={styles.poster}>
        <div className={styles.posterGrid} aria-hidden="true" />
        <div className={styles.posterFade} aria-hidden="true" />
        <span className={styles.livePill}>
          <span className={styles.liveDot} aria-hidden="true" />
          {live}
        </span>
        <div className={styles.camStrip} aria-hidden="true">
          <span className={`${styles.camThumb} ${styles.camThumbActive}`} />
          <span className={styles.camThumb} />
          <span className={styles.camThumb} />
        </div>
      </div>

      <div className={styles.body}>
        <h3 className={styles.title}>{title}</h3>
        <div className={styles.meta}>
          {date} · {venue}
        </div>
        <div className={styles.organizerRow}>
          <span className={styles.organizerAvatar} aria-hidden="true" />
          {organizer}
        </div>

        <div className={styles.divider} aria-hidden="true" />

        <div className={styles.options}>
          <div className={`${styles.option} ${styles.optionSelected}`}>
            <span className={styles.optionInfo}>
              <span className={styles.optionLabel}>{digitalLabel}</span>
              <span className={styles.optionSub}>{digitalSub}</span>
            </span>
            <span className={styles.optionPrice}>R$ 29,90</span>
          </div>
          <div className={styles.option}>
            <span className={styles.optionInfo}>
              <span className={styles.optionLabel}>{physicalLabel}</span>
              <span className={styles.optionSub}>{physicalSub}</span>
            </span>
            <span className={styles.optionPrice}>R$ 60,00</span>
          </div>
        </div>

        <span className={styles.buyButton} role="presentation">
          {buy}
          <ArrowRight size={15} strokeWidth={2.4} />
        </span>
      </div>
    </div>
  );
}
