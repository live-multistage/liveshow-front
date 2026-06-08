'use client';

import Image from 'next/image';
import { ImagePlus } from 'lucide-react';
import styles from './EventDashboardDetailContent.module.scss';

export interface AssetSlot {
  url: string | null;
  uploading: boolean;
  error: string | null;
}

interface Props {
  label: string;
  hint: string;
  slot: AssetSlot;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (file: File) => void;
}

export function AssetSlotUpload({ label, hint, slot, inputRef, onChange }: Props) {
  return (
    <div className={styles.assetSlotItem}>
      <p className={styles.assetSlotLabel}>{label}</p>
      <button
        type="button"
        className={`${styles.assetPreview} ${slot.url ? styles.assetPreviewFilled : ''}`}
        onClick={() => inputRef.current?.click()}
        disabled={slot.uploading}
      >
        {slot.uploading ? (
          <span className={styles.spinner} />
        ) : slot.url ? (
          <Image src={slot.url} alt={label} fill style={{ objectFit: 'cover', borderRadius: '6px' }} sizes="280px" />
        ) : (
          <span className={styles.uploadPlaceholder}>
            <ImagePlus size={20} />
            <span>Selecionar</span>
          </span>
        )}
      </button>
      {slot.error && <p className={styles.assetError}>{slot.error}</p>}
      <p className={styles.assetHint}>{hint}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className={styles.hiddenInput}
        onChange={(e) => e.target.files?.[0] && onChange(e.target.files[0])}
      />
    </div>
  );
}
