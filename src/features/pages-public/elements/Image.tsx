import { isPageHttpsUrl } from '@live-show/api-contracts';
import type { ElementView } from './types';
import { cx } from './types';
import styles from './elements.module.scss';

export const Image: ElementView<'image'> = ({ props, common }) => {
  if (!isPageHttpsUrl(props.url)) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- admin-provided URLs are not in next/image remotePatterns
    <img id={common.id} className={cx(styles.image, common.className)} src={props.url} alt={props.alt} loading="lazy" />
  );
};
