import { ImageResponse } from 'next/og';

export const OG_SIZE = { width: 1200, height: 630 };

export interface BrandCardProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  badge?: string;
}

// >40 chars wraps awkwardly at 88px — drop to 64px so long titles still fit
// on two lines instead of overflowing the card.
// Keeps the badge clear of the bottom edge: three lines of 32px is the most
// the 630px card fits under a two-line title.
export const OG_SUBTITLE_MAX = 140;

export function ogSubtitle(text: string | undefined): string | undefined {
  if (!text) return undefined;
  if (text.length <= OG_SUBTITLE_MAX) return text;
  return `${text.slice(0, OG_SUBTITLE_MAX - 1).trimEnd()}…`;
}

export function ogTitleSize(title: string): number {
  return title.length > 40 ? 64 : 88;
}

// Shared showon.io brand card: gradient bg, pink dot + wordmark, title/subtitle,
// pill badge. Used as the root site card and as the fallback for any public
// page that doesn't render its own richer og image.
export function renderBrandCard({ eyebrow, title, subtitle, badge = 'AO VIVO' }: BrandCardProps): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 80,
          background:
            'radial-gradient(1000px 600px at 15% 0%, #1a0a12 0%, #08080a 60%)',
          color: '#f4f4f5',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 28, height: 28, borderRadius: 9999, background: '#ff2e9e' }} />
          <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1 }}>showon.io</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {eyebrow && (
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: 2,
                textTransform: 'uppercase',
                color: '#ff2e9e',
              }}
            >
              {eyebrow}
            </div>
          )}
          <div
            style={{
              fontSize: ogTitleSize(title),
              fontWeight: 800,
              letterSpacing: -3,
              lineHeight: 1.05,
              maxWidth: 1000,
              display: 'flex',
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: 32, color: '#a1a1aa', maxWidth: 960 }}>{ogSubtitle(subtitle)}</div>
          )}
        </div>

        <div style={{ display: 'flex' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 28px',
              borderRadius: 9999,
              background: '#ff2e9e',
              color: '#0a0a0b',
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            {badge}
          </div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
