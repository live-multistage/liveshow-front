import { ImageResponse } from 'next/og';
import { fetchEvent } from '@/features/events/queries/get-event.server';

export const alt = 'Evento no Liveshow';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

interface Props {
  params: Promise<{ id: string }>;
}

function formatEventDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(iso));
}

export default async function OpengraphImage({ params }: Props) {
  const { id } = await params;

  let title = 'Evento';
  let dateLabel = '';
  let venue: string | null = null;
  let bannerUrl: string | null = null;

  try {
    const event = await fetchEvent(id);
    title = event.title;
    dateLabel = formatEventDate(event.startsAt);
    venue = event.venue;
    bannerUrl = event.bannerUrl;
  } catch {
    // Evento inacessível (rascunho, deletado, API fora): cai no card genérico
    // da marca em vez de quebrar o unfurl do link.
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: '#08080a',
          color: '#f4f4f5',
          fontFamily: 'sans-serif',
        }}
      >
        {bannerUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bannerUrl}
            alt=""
            width={1200}
            height={630}
            style={{ position: 'absolute', top: 0, left: 0, objectFit: 'cover' }}
          />
        )}
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: 72,
            background: bannerUrl
              ? 'linear-gradient(180deg, rgba(8,8,10,0.35) 0%, rgba(8,8,10,0.92) 78%)'
              : 'radial-gradient(1000px 600px at 15% 0%, #1a0a12 0%, #08080a 60%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 9999,
                background: '#ff2e9e',
              }}
            />
            <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1 }}>
              Liveshow
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div
              style={{
                fontSize: title.length > 40 ? 60 : 76,
                fontWeight: 800,
                letterSpacing: -2,
                lineHeight: 1.08,
                maxWidth: 1000,
              }}
            >
              {title}
            </div>
            {(dateLabel || venue) && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  fontSize: 30,
                  color: '#d4d4d8',
                }}
              >
                {dateLabel && <div style={{ display: 'flex' }}>{dateLabel}</div>}
                {dateLabel && venue && (
                  <div style={{ display: 'flex', color: '#ff2e9e' }}>•</div>
                )}
                {venue && <div style={{ display: 'flex' }}>{venue}</div>}
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
