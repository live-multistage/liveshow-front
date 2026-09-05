import styles from './SignalCell.module.scss';

interface SignalBar {
  h: number;
  d: number;
}

const BAR_COUNT = 14;

// ponytail: mirrors the design mock's mk(n, seed) bar generator 1:1 so the
// signal panel matches the reference exactly — deterministic, not random.
export function makeBars(seed: number): SignalBar[] {
  return Array.from({ length: BAR_COUNT }, (_, i) => ({
    h: Math.round((35 + Math.abs(Math.sin(seed + i * 1.7)) * 60) * 1000) / 1000,
    d: Math.round((1.6 + ((seed + i) % 5) * 0.25) * 1000) / 1000,
  }));
}

interface SignalCellProps {
  name: string;
  bitrate: string;
  src: string;
  seed: number;
  height?: number;
}

export function SignalCell({ name, bitrate, src, seed, height = 36 }: SignalCellProps) {
  const bars = makeBars(seed);

  return (
    <div className={styles.cell}>
      <div className={styles.cellHead}>
        <span className={styles.name}>{name}</span>
        <span className={styles.srtOk}>
          <span className={styles.dot} />
          SRT OK
        </span>
      </div>
      <div className={styles.bars} style={{ height }}>
        {bars.map((b, bi) => (
          <span
            key={bi}
            className={bi > BAR_COUNT - 3 ? styles.barPink : styles.bar}
            style={{ height: `${b.h}%`, animationDuration: `${b.d}s` }}
          />
        ))}
      </div>
      <div className={styles.meta}>
        <span>{bitrate}</span>
        <span>{src}</span>
      </div>
    </div>
  );
}
