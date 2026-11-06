import { isPageHttpsUrl, type Breakpoint, type PageBackground, type ResponsiveStyle } from '@live-show/api-contracts';
import { styleClassNames } from './style/style-classes';
import styles from './elements.module.scss';

const HIDE_KEY: Record<Breakpoint, string> = { desktop: 'hide-d', tablet: 'hide-t', mobile: 'hide-m' };

/** Image background layer. Shown only on the breakpoints whose effective `bg` (mobile > tablet > desktop) is an image. */
export function BgImage({ style }: { style: ResponsiveStyle | undefined }) {
  const desktop = style?.desktop?.bg;
  const tablet = style?.tablet?.bg ?? desktop;
  const mobile = style?.mobile?.bg ?? tablet;
  const effective: Record<Breakpoint, PageBackground | undefined> = { desktop, tablet, mobile };
  const image = [desktop, tablet, mobile].find((bg): bg is Extract<PageBackground, { kind: 'image' }> => bg?.kind === 'image');
  if (!image || !isPageHttpsUrl(image.url)) return null;
  const hidden = Object.fromEntries((Object.keys(effective) as Breakpoint[]).filter((bp) => effective[bp]?.kind !== 'image').map((bp) => [bp, true]));
  return (
    <span className={[styles.bgMedia, ...styleClassNames('section', undefined, hidden)].join(' ')} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element -- admin-provided URLs are not in next/image remotePatterns */}
      <img src={image.url} alt="" loading="lazy" />
    </span>
  );
}
