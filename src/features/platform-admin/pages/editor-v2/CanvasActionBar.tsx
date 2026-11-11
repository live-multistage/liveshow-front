'use client';

import type { ReactNode } from 'react';
import { ActionBar } from '@puckeditor/core';
import styles from './PageEditorV2.module.scss';

/** The selection tag: label, select parent, duplicate, delete, in the look of the prototype. */
export function CanvasActionBar({ label, children, parentAction }: { label?: string; children: ReactNode; parentAction: ReactNode }) {
  return (
    <div className={styles.actionBar}>
      <ActionBar>
        <ActionBar.Group>
          {label && <ActionBar.Label label={label} />}
          {parentAction}
        </ActionBar.Group>
        <ActionBar.Group>{children}</ActionBar.Group>
      </ActionBar>
    </div>
  );
}
