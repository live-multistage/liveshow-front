interface LogoProps {
  size?: number;
  showWordmark?: boolean;
  className?: string;
  wordmarkClassName?: string;
}

export function Logo({ size = 22, showWordmark = true, className, wordmarkClassName }: LogoProps) {
  return (
    <>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={className}
      >
        <g fill="#fff">
          <rect x="2"  y="9" width="2.4" height="6"  rx="1.2" />
          <rect x="6"  y="5" width="2.4" height="14" rx="1.2" />
          <rect x="10" y="2" width="2.4" height="20" rx="1.2" />
          <rect x="14" y="6" width="2.4" height="12" rx="1.2" />
          <rect x="18" y="9" width="2.4" height="6"  rx="1.2" />
        </g>
      </svg>
      {showWordmark && (
        <span className={wordmarkClassName}>LIVESHOW</span>
      )}
    </>
  );
}
