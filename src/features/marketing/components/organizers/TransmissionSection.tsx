import { useTranslations } from 'next-intl';
import { Reveal } from '../shared/Reveal';
import { SectionHeader } from '../shared/SectionHeader';
import { FeatureRow } from '../shared/FeatureRow';
import { SignalCell } from '../mocks/SignalCell';
import { organizerIcon, type OrganizerIconKey } from '../../data/organizers-icons';
import styles from './TransmissionSection.module.scss';

interface Signal {
  name: string;
  bitrate: string;
  src: string;
  seed: number;
}

const SIGNAL_META: Array<{ bitrate: string; src: string; seed: number }> = [
  { bitrate: '8.2 Mbps', src: 'srt://ingest-01', seed: 1 },
  { bitrate: '6.4 Mbps', src: 'srt://ingest-01', seed: 4 },
  { bitrate: '4.1 Mbps', src: 'srt://ingest-02', seed: 7 },
  { bitrate: '2.5 Mbps', src: 'srt://ingest-02', seed: 11 },
];

const FEATURE_KEYS: Array<{ key: string; icon: OrganizerIconKey }> = [
  { key: 'multicam', icon: 'cams' },
  { key: 'latency', icon: 'gauge' },
  { key: 'audio', icon: 'audio' },
  { key: 'libras', icon: 'hand' },
  { key: 'recording', icon: 'rec' },
  { key: 'health', icon: 'pulse' },
];

export function TransmissionSection() {
  const t = useTranslations('organizersPage');
  const signalNames = t.raw('transmission.signals') as Array<{ name: string }>;
  const signals: Signal[] = SIGNAL_META.map((meta, i) => {
    const s = signalNames[i];
    if (!s) return null;
    return {
      name: s.name,
      bitrate: meta.bitrate,
      src: meta.src,
      seed: meta.seed,
    };
  }).filter((s): s is Signal => s !== null);

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <SectionHeader
          label={t('transmission.label')}
          title={t('transmission.title')}
          text={t('transmission.text')}
        />

        <Reveal as="div" variant="scale" delay={80} className={styles.panel}>
          <div className={styles.grid}>
            {signals.map((s) => (
              <SignalCell key={s.name} name={s.name} bitrate={s.bitrate} src={s.src} seed={s.seed} />
            ))}
          </div>
        </Reveal>

        <div className={styles.features}>
          {FEATURE_KEYS.map((f, i) => (
            <FeatureRow
              key={f.key}
              icon={organizerIcon(f.icon)}
              title={t(`transmission.features.${f.key}.title`)}
              text={t(`transmission.features.${f.key}.text`)}
              tone="pink"
              delay={(i % 2) * 90}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
