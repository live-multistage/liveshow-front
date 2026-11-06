import type { ElementView } from './types';
import { cx } from './types';
import styles from './elements.module.scss';

export const Divider: ElementView<'divider'> = ({ common }) => (
  <hr id={common.id} className={cx(styles.divider, common.className)} />
);
