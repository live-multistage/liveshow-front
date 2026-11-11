import { pageVideoEmbed } from '@live-show/api-contracts';
import type { ElementView } from './types';
import { cx } from './types';
import styles from './elements.module.scss';

// The embed URL is rebuilt from the provider and the extracted id (platform media: allow-listed host + validated path);
// the URL typed by the user never reaches `src`.
function embedSrc(url: string): { kind: 'iframe' | 'video'; src: string } | null {
  const embed = pageVideoEmbed(url);
  if (!embed) return null;
  if (embed.provider === 'youtube') return { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${embed.id}` };
  if (embed.provider === 'vimeo') return { kind: 'iframe', src: `https://player.vimeo.com/video/${embed.id}` };
  return { kind: 'video', src: `https://${new URL(url).hostname}/${embed.id}` };
}

export const Video: ElementView<'video'> = ({ props, common }) => {
  const embed = embedSrc(props.url);
  if (!embed) return null;
  return (
    <div id={common.id} className={cx(styles.video, common.className)}>
      {embed.kind === 'iframe' ? (
        <iframe
          src={embed.src}
          title="Vídeo"
          loading="lazy"
          allow="fullscreen; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
        />
      ) : (
        <video src={embed.src} controls preload="metadata" />
      )}
    </div>
  );
};
