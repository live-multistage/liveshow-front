export const OG_IMAGE_MAX_BYTES = 2_097_152;
export const OG_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export function precheckOgImage(file: File): 'type' | 'size' | null {
  if (!OG_IMAGE_MIMES.includes(file.type)) return 'type';
  if (file.size > OG_IMAGE_MAX_BYTES) return 'size';
  return null;
}
