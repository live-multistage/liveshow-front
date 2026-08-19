export const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: '#ff2e9e',
  ADMIN: '#9b7bff',
  ORGANIZER: '#46d6d8',
  ARTIST: '#ff7a4d',
  USER: '#9a9aa2',
  OWNER: '#ff2e9e',
  CONTENT_MANAGER: '#46d6d8',
  OPERATOR: '#ff7a4d',
};

export function hexToRgba(hex: string, alpha: number): string {
  const n = hex.replace('#', '');
  const r = parseInt(n.substring(0, 2), 16);
  const g = parseInt(n.substring(2, 4), 16);
  const b = parseInt(n.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function RolePill({ role, label }: { role: string; label?: string }) {
  const color = ROLE_COLORS[role] ?? '#9a9aa2';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontFamily: "'Space Mono', monospace",
        fontSize: '10px',
        fontWeight: 700,
        letterSpacing: '.06em',
        textTransform: 'uppercase',
        padding: '4px 10px',
        borderRadius: '7px',
        whiteSpace: 'nowrap',
        color,
        background: hexToRgba(color, 0.12),
        border: `1px solid ${hexToRgba(color, 0.3)}`,
      }}
    >
      {label ?? role}
    </span>
  );
}
