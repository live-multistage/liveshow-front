'use client';

import { useTranslations } from 'next-intl';
import type { Overrides } from '@puckeditor/core';
import styles from './PageEditorV2.module.scss';

// Stand-ins until V2-U2 (inspector) and V2-U3 (add panel, layers) replace them.
function Placeholder({ testId, labelKey }: { testId: string; labelKey: 'add' | 'layers' | 'inspector' }) {
  const t = useTranslations('platformAdmin.pageEditorV2.panels');
  return <div className={styles.panelPlaceholder} data-testid={testId}>{t(labelKey)}</div>;
}

export const PANEL_OVERRIDES: Partial<Overrides> = {
  components: () => <Placeholder testId="add-panel-placeholder" labelKey="add" />,
  outline: () => <Placeholder testId="layers-panel-placeholder" labelKey="layers" />,
  fields: () => <Placeholder testId="inspector-placeholder" labelKey="inspector" />,
};
