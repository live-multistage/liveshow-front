import { useTranslations } from 'next-intl';
import { Reveal } from '../shared/Reveal';
import { SectionHeader } from '../shared/SectionHeader';
import { advertiserIcon, type AdvertiserIconKey } from '../../data/advertisers-icons';
import styles from './TargetingSection.module.scss';

interface CopyItem {
  title: string;
  text: string;
}

const DESTINATION_ICONS: AdvertiserIconKey[] = ['calendar', 'link'];
const TARGETING_ICONS: AdvertiserIconKey[] = ['layout', 'users', 'target', 'tag', 'calendar', 'repeat'];

export function TargetingSection() {
  const t = useTranslations('advertisersPage.targeting');
  const destinations = t.raw('destinations') as CopyItem[];
  const items = t.raw('items') as CopyItem[];

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <SectionHeader label={t('label')} title={t('title')} />

        <div className={styles.destinationGrid}>
          {destinations.map((dest, i) => (
            <Reveal as="div" key={dest.title} delay={i * 100} className={styles.destinationCard}>
              <span className={styles.destinationIcon}>{advertiserIcon(DESTINATION_ICONS[i] ?? 'calendar', 20)}</span>
              <h3 className={styles.destinationTitle}>{dest.title}</h3>
              <div className={styles.destinationText}>{dest.text}</div>
            </Reveal>
          ))}
        </div>

        <Reveal as="h3" className={styles.subTitle}>
          {t('segmentationTitle')}
        </Reveal>
        <div className={styles.grid}>
          {items.map((item, i) => (
            <Reveal as="div" key={item.title} delay={(i % 2) * 90} className={styles.row}>
              <span className={styles.icon}>{advertiserIcon(TARGETING_ICONS[i] ?? 'target', 18)}</span>
              <div>
                <div className={styles.rowTitle}>{item.title}</div>
                <div className={styles.rowText}>{item.text}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
