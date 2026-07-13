'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Play, Eye, Camera } from 'lucide-react';
import type { Show } from '@/features/events/types/show';
import styles from './HeroSection.module.scss';

interface HeroSectionProps {
  show: Show;
}

export function HeroSection({ show }: HeroSectionProps) {
  const [activeCamIdx, setActiveCamIdx] = useState(0);

  const previewCameras = show.cameras.slice(0, 4);

  const formatViewers = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toString();

  return (
    <section className={styles.hero}>
      <img src={show.image} alt={show.title} className={styles.image} />
      <div className={styles.gradient} />

      <div className={styles.content}>
        {show.isLive && (
          <div className={styles.liveBadge}>
            <span className={styles.liveDot} />
            LIVE
          </div>
        )}

        <h1 className={styles.title}>{show.title}</h1>

        <div className={styles.stats}>
          <div className={styles.statItem}>
            <Eye size={14} />
            <span>{show.viewers ? formatViewers(show.viewers) : '0'} watching</span>
          </div>
          <div className={styles.statItem}>
            <Camera size={14} />
            <span>{show.cameras.length} camera views</span>
          </div>
        </div>
      </div>

      <Link href={`/live/${show.id}`} className={styles.playBtn} aria-label="Play">
        <Play size={30} fill="white" />
      </Link>

      {previewCameras.length > 1 && (
        <div className={styles.cameraStrip}>
          {previewCameras.map((cam, idx) => (
            <button
              key={cam.id}
              onClick={() => setActiveCamIdx(idx)}
              className={`${styles.cameraThumb} ${idx === activeCamIdx ? styles.cameraThumbActive : ''}`}
              aria-label={cam.name}
            >
              <div
                className={styles.cameraThumbImg}
                style={{
                  background: `linear-gradient(150deg, ${cam.color}88, ${cam.color}33)`,
                }}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
