import styles from './MyListEmptyIllustration.module.scss';

/** Ticket stack illustration for the "Minha lista" empty state. Purely decorative. */
export function MyListEmptyIllustration() {
  return (
    <svg
      width="190"
      height="120"
      viewBox="0 0 190 120"
      fill="none"
      aria-hidden="true"
      className={styles.illustration}
    >
      <defs>
        <linearGradient id="ticketLeft" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#161326" />
          <stop offset="1" stopColor="#0e0e18" />
        </linearGradient>
        <linearGradient id="ticketRight" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#241228" />
          <stop offset="1" stopColor="#120a16" />
        </linearGradient>
        <linearGradient id="ticketCenter" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2a0f24" />
          <stop offset="1" stopColor="#140a13" />
        </linearGradient>
      </defs>

      <rect
        x="0"
        y="0"
        width="130"
        height="70"
        rx="12"
        fill="url(#ticketLeft)"
        transform="translate(20 30) rotate(-9 65 35)"
      />
      <rect
        x="0"
        y="0"
        width="130"
        height="70"
        rx="12"
        fill="url(#ticketRight)"
        transform="translate(40 22) rotate(9 65 35)"
      />

      <g transform="translate(25 22)">
        <rect x="0" y="0" width="140" height="76" rx="14" fill="url(#ticketCenter)" stroke="rgba(255,46,158,0.35)" />
        <text x="14" y="20" fontFamily="'Space Mono', monospace" fontSize="8" fill="#ff8ec9">
          INGRESSO
        </text>
        <rect x="14" y="52" width="56" height="5" rx="2.5" fill="#ffffff" opacity="0.55" />
        <rect x="14" y="62" width="36" height="5" rx="2.5" fill="#ffffff" opacity="0.22" />

        <line x1="98" y1="8" x2="98" y2="68" stroke="rgba(255,255,255,0.22)" strokeDasharray="4 4" />
        <path d="M114 32 L114 44 L124 38 Z" fill="#ff8ec9" />
      </g>
    </svg>
  );
}
