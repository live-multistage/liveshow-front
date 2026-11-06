import { PageLink } from '../sections/PageLink';
import type { ElementView } from './types';
import { cx } from './types';
import styles from './elements.module.scss';

export const Button: ElementView<'button'> = ({ props, common }) => (
  <PageLink href={props.href} newTab={props.newTab} className={cx(styles.button, common.className)}>
    {props.label}
  </PageLink>
);
