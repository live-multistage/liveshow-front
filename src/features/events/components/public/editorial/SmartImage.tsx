'use client';

import type { SyntheticEvent } from 'react';
import Image from 'next/image';
import { FALLBACK_IMAGE } from '@/features/events/utils/event-adapter';

// Minimal client island: the ONLY reason the cards can't be pure server
// components is the 404 fallback (a dead thumbnail URL renders the browser's
// broken-image glyph; the adapter's ?? only covers a MISSING url, not a dead
// one). Isolating the <img onError> here keeps every card server-rendered and
// hydrates just this trivial leaf.
export function onImgError(e: SyntheticEvent<HTMLImageElement>) {
  if (e.currentTarget.src !== FALLBACK_IMAGE) e.currentTarget.src = FALLBACK_IMAGE;
}

export function SmartImage(props: { src: string; alt: string; className?: string }) {
  return (
    <Image
      src={props.src}
      alt={props.alt}
      fill
      sizes="(max-width: 640px) 100vw, 320px"
      className={props.className}
      onError={onImgError}
    />
  );
}
