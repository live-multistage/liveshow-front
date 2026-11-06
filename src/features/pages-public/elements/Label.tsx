import type { ElementView } from './types';
import { cx } from './types';
import styles from './elements.module.scss';

export const Label: ElementView<'label'> = ({ props, common }) => (
  <p id={common.id} className={cx(styles.label, common.className)}>{props.text}</p>
);
