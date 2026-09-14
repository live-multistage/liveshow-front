'use client';

import { useTranslations } from 'next-intl';
import { Tooltip, TooltipContent, TooltipTrigger } from '@live-show/design-system';
import type { BlueprintStatus } from '@live-show/api-contracts';
import tableStyles from '../../components/PlatformTable.module.scss';
import styles from './BlueprintStatusPill.module.scss';

const BADGE: Record<BlueprintStatus, string> = {
  ACTIVE: tableStyles.badgeGreen, INACTIVE: tableStyles.badge, INVALID: tableStyles.badgeRed,
};

export { BADGE as STATUS_BADGE };

// Design A1/B1: pills carry a dot on ACTIVE and, on INVALID, a tooltip
// explaining why runs stopped without repeating the copy on every screen.
export function BlueprintStatusPill({ status }: { status: BlueprintStatus }) {
  const t = useTranslations('platformAdmin.blueprints');
  const pill = (
    <span className={`${BADGE[status]} ${styles.pill}`}>
      {status === 'ACTIVE' && <span className={styles.dot} />}
      {t(`status.${status}`)}
    </span>
  );

  if (status !== 'INVALID') return pill;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{pill}</TooltipTrigger>
      <TooltipContent>{t('status.invalidTooltip')}</TooltipContent>
    </Tooltip>
  );
}
