'use client';

import type { Overrides } from '@puckeditor/core';
import { CanvasActionBar } from './CanvasActionBar';
import { ElementInspector } from './inspector/ElementInspector';
import { AddPanel } from './left/AddPanel';
import { LayersPanel } from './left/LayersPanel';

export const PANEL_OVERRIDES: Partial<Overrides> = {
  components: () => <AddPanel />,
  outline: () => <LayersPanel />,
  fields: () => <ElementInspector />,
  actionBar: CanvasActionBar as Overrides['actionBar'],
};
