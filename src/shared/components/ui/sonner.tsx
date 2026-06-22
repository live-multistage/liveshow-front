"use client";

import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => (
  <Sonner
    theme="dark"
    position="bottom-right"
    toastOptions={{
      style: {
        background: '#131316',
        border: '1px solid #27272A',
        color: '#FFFFFF',
        fontFamily: "'Space Mono', monospace",
        fontSize: '0.8125rem',
        borderRadius: '8px',
      },
    }}
    {...props}
  />
);

export { Toaster };
