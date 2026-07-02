'use client';

import { X } from 'lucide-react';
import { HlsVideo } from './HlsVideo';
import styles from './HlsPreview.module.scss';

interface Props {
  packageId: string;
  onClose: () => void;
}

export function HlsPreview({ packageId, onClose }: Props) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.box} onClick={(e) => e.stopPropagation()}>
        <button className={styles.close} onClick={onClose} title="Fechar"><X size={16} /></button>
        <HlsVideo packageId={packageId} className={styles.video} controls />
      </div>
    </div>
  );
}
