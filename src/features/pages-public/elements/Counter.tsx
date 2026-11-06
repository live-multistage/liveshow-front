import type { ElementView } from './types';
import { cx } from './types';
import styles from './elements.module.scss';

export const Counter: ElementView<'counter'> = ({ props, common }) => (
  <div id={common.id} className={cx(styles.counter, common.className)}>
    <span className={styles.counterValue}>{props.value}</span>
    <span className={styles.counterLabel}>{props.label}</span>
  </div>
);
