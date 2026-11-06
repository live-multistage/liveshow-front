import type { ElementView } from './types';
import { cx } from './types';
import styles from './elements.module.scss';

export const Column: ElementView<'column'> = ({ common, children, background }) => (
  <div id={common.id} className={cx(styles.column, common.className)}>
    {background}
    {children}
  </div>
);
