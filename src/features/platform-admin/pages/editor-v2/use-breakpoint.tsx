'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Viewports } from '@puckeditor/core';
import type { Breakpoint } from '@live-show/api-contracts';

/** Real canvas widths (SDD §2.4); the renderers answer to the container, not to the window. */
export const BREAKPOINT_WIDTH: Record<Breakpoint, number> = { desktop: 1280, tablet: 768, mobile: 390 };

export const VIEWPORTS: Viewports = [
  { width: BREAKPOINT_WIDTH.desktop, label: 'Desktop', icon: 'Monitor' },
  { width: BREAKPOINT_WIDTH.tablet, label: 'Tablet', icon: 'Tablet' },
  { width: BREAKPOINT_WIDTH.mobile, label: 'Celular', icon: 'Smartphone' },
];

export function breakpointFromWidth(width: number | '100%'): Breakpoint {
  if (width === '100%') return 'desktop';
  if (width <= BREAKPOINT_WIDTH.mobile) return 'mobile';
  if (width <= BREAKPOINT_WIDTH.tablet) return 'tablet';
  return 'desktop';
}

interface BreakpointState {
  breakpoint: Breakpoint;
  setBreakpoint(next: Breakpoint): void;
}

const BreakpointContext = createContext<BreakpointState>({ breakpoint: 'desktop', setBreakpoint: () => undefined });

/** The editor's current breakpoint. `ViewportBridge` keeps it equal to the Puck viewport, which is the source of truth. */
export function BreakpointProvider({ children }: { children: ReactNode }) {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');
  const value = useMemo(() => ({ breakpoint, setBreakpoint }), [breakpoint]);
  return <BreakpointContext.Provider value={value}>{children}</BreakpointContext.Provider>;
}

export const useBreakpoint = () => useContext(BreakpointContext).breakpoint;
export const useBreakpointSetter = () => useContext(BreakpointContext).setBreakpoint;
