export type AdKind = 'banner' | 'preroll' | 'pause' | 'vitrine';

export const AD_KIND_LABEL: Record<AdKind, string> = {
  banner: 'Banner',
  preroll: 'Vídeo antes',
  pause: 'Pausa',
  vitrine: 'Vitrine',
};

// Pre-roll e pausa são posicionamentos exclusivos (não combinam com os de
// página), então os posicionamentos já dizem o tipo. A lista do super admin
// traz `placements` como string separada por vírgula.
export function adKindFromPlacements(placements: string | string[] | undefined): AdKind {
  const list = Array.isArray(placements) ? placements : (placements ?? '').split(',');
  if (list.includes('PRE_ROLL')) return 'preroll';
  if (list.includes('PLAYER_PAUSE')) return 'pause';
  if (list.includes('PLAYER_OVERLAY')) return 'vitrine';
  return 'banner';
}

export function adKindFromFormat(format: string): AdKind {
  if (format === 'VIDEO_16_9') return 'preroll';
  if (format === 'WIDE_16_9') return 'pause';
  if (format === 'LOGO_4x1' || format === 'LOGO_2x3') return 'vitrine';
  return 'banner';
}
