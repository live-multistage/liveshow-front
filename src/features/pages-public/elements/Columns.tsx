import type { ElementView } from './types';
import { cx } from './types';
import styles from './elements.module.scss';

export const Columns: ElementView<'columns'> = ({ common, children }) => (
  <div id={common.id} className={cx(styles.columns, common.className)}>
    {children}
  </div>
);
