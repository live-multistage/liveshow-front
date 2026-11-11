import type { ElementView } from './types';
import { cx } from './types';
import styles from './elements.module.scss';

export const Spacer: ElementView<'spacer'> = ({ common }) => (
  <div id={common.id} aria-hidden="true" className={cx(styles.spacer, common.className)} />
);
