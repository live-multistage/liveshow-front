import { useTranslations } from 'next-intl';
import { Reveal } from '../shared/Reveal';
import { SectionHeader } from '../shared/SectionHeader';
import { FeatureRow } from '../shared/FeatureRow';
import { organizerIcon, type OrganizerIconKey } from '../../data/organizers-icons';
import styles from './TransmissionSection.module.scss';

interface SignalBar {
  h: number;
  d: number;
}

interface Signal {
  name: string;
  bitrate: string;
  src: string;
  bars: SignalBar[];
}

const SIGNAL_META: Array<{ bitrate: string; src: string; seed: number }> = [
  { bitrate: '8.2 Mbps', src: 'srt://ingest-01', seed: 1 },
  { bitrate: '6.4 Mbps', src: 'srt://ingest-01', seed: 4 },
  { bitrate: '4.1 Mbps', src: 'srt://ingest-02', seed: 7 },
  { bitrate: '2.5 Mbps', src: 'srt://ingest-02', seed: 11 },
];

const BAR_COUNT = 14;

// ponytail: mirrors the design mock's mk(n, seed) bar generator 1:1 so the
// signal panel matches the reference exactly — deterministic, not random.
function makeBars(seed: number): SignalBar[] {
  return Array.from({ length: BAR_COUNT }, (_, i) => ({
    h: Math.round((35 + Math.abs(Math.sin(seed + i * 1.7)) * 60) * 1000) / 1000,
    d: Math.round((1.6 + ((seed + i) % 5) * 0.25) * 1000) / 1000,
  }));
}

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
  const signals: Signal[] = signalNames.map((s, i) => ({
    name: s.name,
    bitrate: SIGNAL_META[i].bitrate,
    src: SIGNAL_META[i].src,
    bars: makeBars(SIGNAL_META[i].seed),
  }));

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
              <div key={s.name} className={styles.cell}>
                <div className={styles.cellHead}>
                  <span className={styles.name}>{s.name}</span>
                  <span className={styles.srtOk}>
                    <span className={styles.dot} />
                    SRT OK
                  </span>
                </div>
                <div className={styles.bars}>
                  {s.bars.map((b, bi) => (
                    <span
                      key={bi}
                      className={bi > BAR_COUNT - 3 ? styles.barPink : styles.bar}
                      style={{ height: `${b.h}%`, animationDuration: `${b.d}s` }}
                    />
                  ))}
                </div>
                <div className={styles.meta}>
                  <span>{s.bitrate}</span>
                  <span>{s.src}</span>
                </div>
              </div>
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
