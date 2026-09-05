import { SignalCell } from './SignalCell';
import styles from './LatencyPanel.module.scss';

interface LatencySignal {
  name: string;
}

interface LatencyPanelProps {
  label: string;
  pill: string;
  signals: LatencySignal[];
}

const SIGNAL_META: Array<{ bitrate: string; src: string; seed: number }> = [
  { bitrate: '8.2 Mbps', src: 'srt://ingest-01', seed: 1 },
  { bitrate: '6.4 Mbps', src: 'srt://ingest-01', seed: 4 },
];

export function LatencyPanel({ label, pill, signals }: LatencyPanelProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.label}>{label}</div>
          <div className={styles.number}>
            2.8<span className={styles.unit}>s</span>
          </div>
        </div>
        <div className={styles.pill}>
          <span className={styles.dot} />
          {pill}
        </div>
      </div>
      <div className={styles.body}>
        {signals.map((signal, i) => {
          const meta = SIGNAL_META[i];
          if (!meta) return null;
          return (
            <SignalCell
              key={signal.name}
              name={signal.name}
              bitrate={meta.bitrate}
              src={meta.src}
              seed={meta.seed}
              height={32}
            />
          );
        })}
      </div>
    </div>
  );
}
