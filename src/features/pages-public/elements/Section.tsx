import type { ElementView } from './types';
import { cx } from './types';
import styles from './elements.module.scss';

export const Section: ElementView<'section'> = ({ common, children, background }) => (
  <section id={common.id} className={cx(styles.section, common.className)}>
    {background}
    <div className={styles.inner} data-slot="section">{children}</div>
  </section>
);
