import type { ElementView } from './types';
import { cx } from './types';
import styles from './elements.module.scss';

export const Faq: ElementView<'faq'> = ({ props, common }) => (
  <div id={common.id} className={cx(styles.faq, common.className)}>
    {props.items.map((it, i) => (
      <details key={i}>
        <summary>{it.question}</summary>
        <p>{it.answer}</p>
      </details>
    ))}
  </div>
);
