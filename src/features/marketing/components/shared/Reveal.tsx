'use client';

import { useEffect, useRef, useState, type CSSProperties, type JSX, type ReactNode } from 'react';
import styles from './Reveal.module.scss';

interface RevealProps {
  children: ReactNode;
  delay?: number;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  variant?: 'up' | 'scale';
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function Reveal({ children, delay = 0, as = 'div', className, variant = 'up' }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  // No IntersectionObserver (jsdom) or reduced motion → render already visible.
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined' || prefersReducedMotion());

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          setVisible(true);
          observer.unobserve(el);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    observer.observe(el);

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const Tag = as as 'div';
  const style = { '--reveal-delay': `${delay}ms` } as CSSProperties;
  const cls = [styles.reveal, styles[variant], visible ? styles.visible : '', className ?? ''].join(' ').trim();

  return (
    <Tag ref={ref as never} className={cls} style={style}>
      {children}
    </Tag>
  );
}
