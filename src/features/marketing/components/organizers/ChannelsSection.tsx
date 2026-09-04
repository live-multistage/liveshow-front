import { useTranslations } from 'next-intl';
import { Reveal } from '../shared/Reveal';
import { SectionHeader } from '../shared/SectionHeader';
import styles from './ChannelsSection.module.scss';

const HOURS = ['18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];

interface SlotDef {
  slotKey: string;
  kindKey: string;
  column: string;
  span: number;
  highlight?: boolean;
}

const SLOTS: SlotDef[] = [
  { slotKey: 'pre', kindKey: 'program', column: '1', span: 2 },
  { slotKey: 'round12a', kindKey: 'live4', column: '3', span: 5, highlight: true },
  { slotKey: 'roundtable', kindKey: 'program', column: '8', span: 3 },
  { slotKey: 'highlights', kindKey: 'replay', column: '11', span: 2 },
  { slotKey: 'backstage', kindKey: 'programWeekly', column: '1', span: 3 },
  { slotKey: 'round12b', kindKey: 'live2', column: '4', span: 4 },
];

export function ChannelsSection() {
  const t = useTranslations('organizersPage');

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <SectionHeader
          label={t('channels.label')}
          title={t('channels.title')}
          text={t('channels.text')}
          maxTitleCh={22}
        />

        <Reveal as="div" variant="scale" delay={120} className={styles.panel}>
          <div className={styles.panelHead}>
            <div className={styles.panelHeadLeft}>
              <span className={styles.swatch} />
              <div>
                <div className={styles.channelName}>{t('channels.mock.channel')}</div>
                <div className={styles.grade}>{t('channels.mock.grade')}</div>
              </div>
            </div>
            <span className={styles.onAir}>
              <span className={styles.onAirDot} />
              {t('channels.mock.onAir')}
            </span>
          </div>

          <div className={styles.panelBody}>
            <div className={styles.hours}>
              {HOURS.map((hour) => (
                <span key={hour}>{hour}</span>
              ))}
            </div>
            <div className={styles.grid}>
              {SLOTS.map((slot) => (
                <div
                  key={slot.slotKey}
                  className={[styles.slot, slot.highlight ? styles.slotHighlight : ''].join(' ').trim()}
                  style={{ gridColumn: `${slot.column} / span ${slot.span}` }}
                >
                  {t(`channels.mock.slots.${slot.slotKey}`)}
                  <div className={styles.slotKind}>{t(`channels.mock.kinds.${slot.kindKey}`)}</div>
                </div>
              ))}
              <div className={styles.nowLine} />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
