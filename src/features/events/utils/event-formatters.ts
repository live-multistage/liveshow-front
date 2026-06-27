export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function formatDuration(startsAt: string, endsAt: string) {
  const ms = new Date(endsAt).getTime() - new Date(startsAt).getTime();
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export function formatPrice(price: number) {
  return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatPriceRange(
  priceRange: { min: number; max: number } | undefined,
  fallbackPrice?: number,
): string {
  if (!priceRange) {
    if (fallbackPrice === undefined || fallbackPrice === 0) return 'Grátis';
    return formatPrice(fallbackPrice);
  }
  const { min, max } = priceRange;
  if (min === 0 && max === 0) return 'Grátis';
  if (min === max) return formatPrice(min);
  if (min === 0) return `Grátis – ${formatPrice(max)}`;
  return `${formatPrice(min)} – ${formatPrice(max)}`;
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    DRAFT: 'Rascunho', PUBLISHED: 'Em breve', SCHEDULED: 'Em breve', LIVE: 'Ao vivo',
    FINISHED: 'Encerrado', CANCELLED: 'Cancelado',
  };
  return map[status] ?? status;
}

const CAMERA_ANGLES = [
  'Palco Frontal', 'Vista Aérea', 'Lateral Esquerda', 'Lateral Direita',
  'Plateia', 'Bateria', 'Guitarra', 'Backstage', 'VIP',
];

const CAMERA_GRADIENTS = [
  'linear-gradient(135deg, #1a1a2e, #16213e)',
  'linear-gradient(135deg, #0f3460, #533483)',
  'linear-gradient(135deg, #1a1a2e, #4a0e0e)',
  'linear-gradient(135deg, #0d2137, #1b4332)',
  'linear-gradient(135deg, #2d1b69, #11998e)',
];

export function buildCameras(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `cam${i + 1}`,
    name: `Câmera ${i + 1}`,
    angle: CAMERA_ANGLES[i] ?? `Ângulo ${i + 1}`,
    gradient: CAMERA_GRADIENTS[i % CAMERA_GRADIENTS.length],
  }));
}
