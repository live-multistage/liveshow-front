import type { HouseAdFormat } from '../../house-ads';

// Mirrors the backend's own creative-upload limits (enforced again server
// side). Checking client side just saves the admin a round trip.
export const IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 50 * 1024 * 1024;
export const VIDEO_MAX_DURATION_SEC = 30;
export const WIDE_16_9_MIN_WIDTH = 1280;
export const WIDE_16_9_MIN_HEIGHT = 720;
const RATIO_16_9 = 16 / 9;
const RATIO_TOLERANCE = 0.02;

export const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export const VIDEO_MIME_TYPES = ['video/mp4'];

const bytesToMb = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1).replace('.', ',');

export function isVideoFormat(format: HouseAdFormat): boolean {
  return format === 'VIDEO_16_9';
}

/** Type + size checks — synchronous, no file I/O. */
export function validateFileBasics(file: File, format: HouseAdFormat): string | null {
  if (isVideoFormat(format)) {
    if (!VIDEO_MIME_TYPES.includes(file.type)) return 'Envie um vídeo MP4.';
    if (file.size > VIDEO_MAX_BYTES) return `O vídeo tem ${bytesToMb(file.size)} MB. O limite é 50 MB.`;
    return null;
  }
  if (!IMAGE_MIME_TYPES.includes(file.type)) return 'Envie uma imagem PNG, JPG ou WEBP.';
  if (file.size > IMAGE_MAX_BYTES) return `A imagem tem ${bytesToMb(file.size)} MB. O limite é 2 MB.`;
  return null;
}

export function probeImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image-decode-failed'));
    };
    img.src = url;
  });
}

export function probeVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('video-decode-failed'));
    };
    video.src = url;
  });
}

function ratioMatches16x9(width: number, height: number): boolean {
  const ratio = width / height;
  return Math.abs(ratio - RATIO_16_9) / RATIO_16_9 <= RATIO_TOLERANCE;
}

/**
 * Full client-side validation: type/size first (sync, always enforced), then
 * format-specific dimension/duration checks. A probe failure (file the
 * browser can't decode) is reported as its own error rather than silently
 * passing — a file that won't decode here won't play for viewers either.
 */
export async function validateCreativeFile(file: File, format: HouseAdFormat): Promise<string | null> {
  const basicsError = validateFileBasics(file, format);
  if (basicsError) return basicsError;

  if (isVideoFormat(format)) {
    try {
      const duration = await probeVideoDuration(file);
      if (duration > VIDEO_MAX_DURATION_SEC) {
        return `O vídeo tem ${Math.round(duration)} s. O limite é 30 s.`;
      }
      return null;
    } catch {
      return 'Não foi possível ler este vídeo.';
    }
  }

  if (format === 'WIDE_16_9') {
    try {
      const { width, height } = await probeImageDimensions(file);
      if (width < WIDE_16_9_MIN_WIDTH || height < WIDE_16_9_MIN_HEIGHT) {
        return `A imagem é ${width}×${height}. O mínimo é ${WIDE_16_9_MIN_WIDTH}×${WIDE_16_9_MIN_HEIGHT}.`;
      }
      if (!ratioMatches16x9(width, height)) {
        return 'A imagem precisa ter proporção 16:9.';
      }
      return null;
    } catch {
      return 'Não foi possível ler esta imagem.';
    }
  }

  return null;
}
