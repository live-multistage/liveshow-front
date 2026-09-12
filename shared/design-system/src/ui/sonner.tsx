'use client';

import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';
import './sonner.scss';

const TOAST_DURATION_MS = 4600;

const icons = {
  success: <CircleCheck aria-hidden />,
  info: <Info aria-hidden />,
  warning: <TriangleAlert aria-hidden />,
  error: <CircleAlert aria-hidden />,
  close: <X aria-hidden />,
};

const Toaster = ({ ...props }: ToasterProps) => (
  <Sonner
    theme="dark"
    position="bottom-right"
    duration={TOAST_DURATION_MS}
    closeButton
    icons={icons}
    gap={12}
    {...props}
  />
);

export { Toaster };
