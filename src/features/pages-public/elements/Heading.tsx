import { HEADING_TAGS } from '@live-show/api-contracts';
import type { ElementView } from './types';
import { cx } from './types';
import styles from './elements.module.scss';

export const Heading: ElementView<'heading'> = ({ props, common }) => {
  const Tag = HEADING_TAGS.includes(props.tag) ? props.tag : 'h2';
  return <Tag id={common.id} className={cx(styles.heading, common.className)}>{props.text}</Tag>;
};
