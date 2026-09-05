import styles from './TicketPairMock.module.scss';

interface TicketPairMockProps {
  live: string;
  event: string;
  date: string;
  digitalLabel: string;
  physicalLabel: string;
  gate: string;
  access: string;
  watch: string;
}

const QR_SIZE = 7;

// ponytail: decorative finder-corner squares (top-left, top-right, bottom-left)
// mirror a real QR code's shape without encoding anything.
function isFinderCorner(row: number, col: number): boolean {
  const topLeft = row < 3 && col < 3;
  const topRight = row < 3 && col > 3;
  const bottomLeft = row > 3 && col < 3;
  return topLeft || topRight || bottomLeft;
}

function buildQrCells(): boolean[] {
  return Array.from({ length: QR_SIZE * QR_SIZE }, (_, i) => {
    const row = Math.floor(i / QR_SIZE);
    const col = i % QR_SIZE;
    return isFinderCorner(row, col) || (i * QR_SIZE + row * 3) % 5 < 2;
  });
}

export function TicketPairMock({
  live,
  event,
  date,
  digitalLabel,
  physicalLabel,
  gate,
  access,
  watch,
}: TicketPairMockProps) {
  const qrCells = buildQrCells();

  return (
    <div className={styles.pair}>
      <div className={styles.digital}>
        <div className={styles.digitalTop}>
          <div className={styles.digitalHead}>
            <span className={styles.digitalLabel}>{digitalLabel}</span>
            <span className={styles.livePill}>
              <span className={styles.liveDot} aria-hidden="true" />
              {live}
            </span>
          </div>
          <div className={styles.title}>{event}</div>
          <div className={styles.date}>{date}</div>
        </div>
        <div className={styles.digitalBottom}>
          <div className={styles.accessRow}>
            <span>{access}</span>
            <span className={styles.price}>R$ 29,90</span>
          </div>
          <span className={styles.watchButton} role="presentation">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M7 4v16l13-8z" />
            </svg>
            {watch}
          </span>
        </div>
      </div>

      <div className={styles.physical}>
        <div className={styles.physicalTop}>
          <div className={styles.physicalHead}>
            <span className={styles.physicalLabel}>{physicalLabel}</span>
            <span className={styles.gateChip}>{gate}</span>
          </div>
        </div>
        <div className={styles.physicalBottom}>
          <div className={styles.qr} aria-hidden="true">
            {qrCells.map((dark, i) => (
              <span key={i} className={dark ? styles.qrCellDark : styles.qrCell} />
            ))}
          </div>
          <span className={styles.code}>SHW-4471-02</span>
        </div>
      </div>
    </div>
  );
}
