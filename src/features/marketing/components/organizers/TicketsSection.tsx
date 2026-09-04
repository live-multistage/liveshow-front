import { useTranslations } from 'next-intl';
import { Reveal } from '../shared/Reveal';
import { SectionHeader } from '../shared/SectionHeader';
import { organizerIcon, type OrganizerIconKey } from '../../data/organizers-icons';
import styles from './TicketsSection.module.scss';

const ITEM_KEYS: Array<{ key: string; icon: OrganizerIconKey }> = [
  { key: 'digital', icon: 'ticket' },
  { key: 'free', icon: 'gift' },
  { key: 'physical', icon: 'qr' },
  { key: 'coupons', icon: 'tag' },
  { key: 'replay', icon: 'replay' },
  { key: 'collab', icon: 'users' },
];

export function TicketsSection() {
  const t = useTranslations('organizersPage');

  return (
    <section className={styles.section}>
      <div className={styles.glow} />
      <div className={styles.container}>
        <SectionHeader
          label={t('tickets.label')}
          title={t('tickets.title')}
          align="center"
          maxTitleCh={16}
        />

        <div className={styles.grid}>
          {ITEM_KEYS.map((item, i) => (
            <Reveal as="div" key={item.key} delay={(i % 3) * 90} className={styles.card}>
              <span className={styles.icon}>{organizerIcon(item.icon, 28)}</span>
              <div>
                <div className={styles.title}>{t(`tickets.items.${item.key}.title`)}</div>
                <p className={styles.text}>{t(`tickets.items.${item.key}.text`)}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
