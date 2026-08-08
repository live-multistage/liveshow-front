// Client-side mirror of the backend's teaser-video constraints (POST
// /events/:id/assets/teaserVideo), so bad files fail fast instead of
// burning an upload round-trip.
const MAX_TEASER_VIDEO_BYTES = 50 * 1024 * 1024; // 52428800
const MAX_TEASER_VIDEO_DURATION_SECONDS = 30;
const TEASER_VIDEO_MIME = 'video/mp4';

export async function validateTeaserVideo(file: File): Promise<string | null> {
  if (file.type !== TEASER_VIDEO_MIME) {
    return 'O vídeo precisa estar no formato MP4.';
  }
  if (file.size > MAX_TEASER_VIDEO_BYTES) {
    return 'O vídeo precisa ter no máximo 50MB.';
  }

  let duration: number;
  try {
    duration = await readVideoDuration(file);
  } catch {
    return 'Não foi possível ler o vídeo selecionado.';
  }

  if (duration > MAX_TEASER_VIDEO_DURATION_SECONDS) {
    return 'O vídeo precisa ter no máximo 30 segundos.';
  }

  return null;
}

// Off-DOM <video> is the standard way to read a file's duration in-browser
// without uploading it first.
function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const url = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('invalid video file'));
    };

    video.src = url;
  });
}
