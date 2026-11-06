import type { ElementView } from './types';
import { cx } from './types';
import styles from './elements.module.scss';

const Check = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const IconList: ElementView<'iconList'> = ({ props, common }) => (
  <ul id={common.id} className={cx(styles.iconList, common.className)}>
    {props.items.map((item, i) => (
      <li key={i}><Check />{item}</li>
    ))}
  </ul>
);
