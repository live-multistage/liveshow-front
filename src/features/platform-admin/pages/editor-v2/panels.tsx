'use client';

import { useTranslations } from 'next-intl';
import type { Overrides } from '@puckeditor/core';
import { AddPanel } from './left/AddPanel';
import { LayersPanel } from './left/LayersPanel';
import styles from './PageEditorV2.module.scss';

// Stand-in until V2-U2 (inspector) replaces it.
function Placeholder({ testId, labelKey }: { testId: string; labelKey: 'inspector' }) {
  const t = useTranslations('platformAdmin.pageEditorV2.panels');
  return <div className={styles.panelPlaceholder} data-testid={testId}>{t(labelKey)}</div>;
}

export const PANEL_OVERRIDES: Partial<Overrides> = {
  components: () => <AddPanel />,
  outline: () => <LayersPanel />,
  fields: () => <Placeholder testId="inspector-placeholder" labelKey="inspector" />,
};
