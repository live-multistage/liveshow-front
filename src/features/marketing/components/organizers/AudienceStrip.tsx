import { useTranslations } from 'next-intl';
import { Reveal } from '../shared/Reveal';
import { organizerIcon, type OrganizerIconKey } from '../../data/organizers-icons';
import styles from './AudienceStrip.module.scss';

const AUDIENCES: Array<{ key: string; icon: OrganizerIconKey }> = [
  { key: 'shows', icon: 'music' },
  { key: 'sports', icon: 'trophy' },
  { key: 'talks', icon: 'mic' },
  { key: 'worship', icon: 'church' },
  { key: 'theater', icon: 'drama' },
  { key: 'classes', icon: 'book' },
];

export function AudienceStrip() {
  const t = useTranslations('organizersPage.audiences');

  return (
    <section className={styles.section}>
      <div className={styles.list}>
        {AUDIENCES.map(({ key, icon }, i) => (
          <Reveal key={key} delay={i * 70} className={styles.chip}>
            <span className={styles.icon}>{organizerIcon(icon, 18)}</span>
            {t(key)}
          </Reveal>
        ))}
      </div>
    </section>
  );
}
