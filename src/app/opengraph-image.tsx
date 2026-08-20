import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Liveshow — shows ao vivo de todo o mundo, na palma da sua mão.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 9999,
              background: '#ff2e9e',
            }}
          />
          <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1 }}>
            Liveshow
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div
            style={{
              fontSize: 88,
              fontWeight: 800,
              letterSpacing: -3,
              lineHeight: 1.05,
              maxWidth: 900,
            }}
          >
            Shows ao vivo de todo o mundo
          </div>
          <div style={{ fontSize: 36, color: '#a1a1aa' }}>
            na palma da sua mão.
          </div>
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
            AO VIVO
          </div>
        </div>
      </div>
    ),
    size,
  );
}
