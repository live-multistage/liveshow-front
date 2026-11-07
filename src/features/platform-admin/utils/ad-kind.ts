export type AdKind = 'banner' | 'preroll' | 'pause';

export const AD_KIND_LABEL: Record<AdKind, string> = {
  banner: 'Banner',
  preroll: 'Vídeo antes',
  pause: 'Pausa',
};

// Pre-roll e pausa são posicionamentos exclusivos (não combinam com os de
// página), então os posicionamentos já dizem o tipo. A lista do super admin
// traz `placements` como string separada por vírgula.
export function adKindFromPlacements(placements: string | string[] | undefined): AdKind {
  const list = Array.isArray(placements) ? placements : (placements ?? '').split(',');
  if (list.includes('PRE_ROLL')) return 'preroll';
  if (list.includes('PLAYER_PAUSE')) return 'pause';
  return 'banner';
}

export function adKindFromFormat(format: string): AdKind {
  if (format === 'VIDEO_16_9') return 'preroll';
  if (format === 'WIDE_16_9') return 'pause';
  return 'banner';
}
