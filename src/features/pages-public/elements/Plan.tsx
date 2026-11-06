import { PageLink } from '../sections/PageLink';
import type { ElementView } from './types';
import { cx } from './types';
import styles from './elements.module.scss';

export const Plan: ElementView<'plan'> = ({ props, common, background }) => (
  <div id={common.id} className={cx(styles.plan, common.className)}>
    {background}
    <b className={styles.planName}>{props.name}</b>
    <span className={styles.planPrice}>{props.price}</span>
    {props.description && <p className={styles.planDescription}>{props.description}</p>}
    {props.cta && <PageLink href={props.cta.href} className={styles.planCta}>{props.cta.label}</PageLink>}
  </div>
);
