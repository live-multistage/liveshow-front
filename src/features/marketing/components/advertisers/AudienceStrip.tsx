import { useTranslations } from 'next-intl';
import { Reveal } from '../shared/Reveal';
import { advertiserIcon, type AdvertiserIconKey } from '../../data/advertisers-icons';
import styles from '../shared/AudienceStrip.module.scss';

const AUDIENCES: Array<{ key: string; icon: AdvertiserIconKey }> = [
  { key: 'brands', icon: 'brand' },
  { key: 'producers', icon: 'producer' },
  { key: 'sponsors', icon: 'sponsor' },
  { key: 'local', icon: 'local' },
];

export function AudienceStrip() {
  const t = useTranslations('advertisersPage.audiences');

  return (
    <section className={styles.section}>
      <div className={styles.list}>
        {AUDIENCES.map(({ key, icon }, i) => (
          <Reveal key={key} delay={i * 70} className={styles.chip}>
            <span className={styles.icon}>{advertiserIcon(icon, 18)}</span>
            {t(key)}
          </Reveal>
        ))}
      </div>
    </section>
  );
}
