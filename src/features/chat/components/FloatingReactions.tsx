'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactionEmoji } from '../types/chat.types';
import styles from './FloatingReactions.module.scss';

interface Props {
  counts: Record<ReactionEmoji, number>;
}

interface Particle {
  id: number;
  emoji: ReactionEmoji;
  left: number;
  delay: number;
}

// ponytail: fixed budgets rather than a queue/priority system — this is a
// live-chat vanity effect, not something that needs fairness guarantees.
const MAX_PARTICLES_PER_DELTA = 8;
const MAX_LIVE_PARTICLES = 40;
const PARTICLE_LIFETIME_MS = 1600;

let particleId = 0;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function FloatingReactions({ counts }: Props) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const prevCountsRef = useRef<Record<ReactionEmoji, number> | null>(null);
  const pendingTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const reducedMotion = useRef(prefersReducedMotion());

  useEffect(() => {
    if (reducedMotion.current) return;
    const prev = prevCountsRef.current;
    prevCountsRef.current = counts;
    // First snapshot has nothing to diff against — spawn nothing on mount.
    if (!prev) return;

    const spawned: Particle[] = [];
    for (const emoji of Object.keys(counts) as ReactionEmoji[]) {
      const delta = counts[emoji] - (prev[emoji] ?? 0);
      if (delta <= 0) continue;
      const spawnCount = Math.min(delta, MAX_PARTICLES_PER_DELTA);
      for (let i = 0; i < spawnCount; i++) {
        spawned.push({
          id: particleId++,
          emoji,
          left: Math.random() * 80 + 10,
          delay: Math.round(Math.random() * 200),
        });
      }
    }
    if (spawned.length === 0) return;

    setParticles((current) => [...current, ...spawned].slice(-MAX_LIVE_PARTICLES));

    for (const particle of spawned) {
      const timeoutId = setTimeout(() => {
        pendingTimeoutsRef.current.delete(timeoutId);
        setParticles((current) => current.filter((p) => p.id !== particle.id));
      }, PARTICLE_LIFETIME_MS + particle.delay);
      pendingTimeoutsRef.current.add(timeoutId);
    }
  }, [counts]);

  // Only clear pending removals on unmount — an effect cleanup tied to every
  // `counts` change would cancel earlier particles' removal timers whenever
  // a new snapshot arrives before they finish animating.
  useEffect(() => {
    const timeouts = pendingTimeoutsRef.current;
    return () => {
      timeouts.forEach(clearTimeout);
      timeouts.clear();
    };
  }, []);

  if (reducedMotion.current) return null;

  return (
    <div className={styles.container} aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className={styles.particle}
          style={{ left: `${p.left}%`, animationDelay: `${p.delay}ms` }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}
