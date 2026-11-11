import type { ElementView } from './types';
import { cx } from './types';
import styles from './elements.module.scss';

export const Group: ElementView<'group'> = ({ common, children }) => (
  <div id={common.id} className={cx(styles.group, common.className)}>
    {children}
  </div>
);
