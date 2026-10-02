import type { Metadata } from 'next';
import { fetchFeatureFlags } from '@/features/feature-flags';
import { SessionJourneyPage } from '@/features/tracking-admin/components/session/SessionJourneyPage';

export const metadata: Metadata = { title: 'Plataforma — Tracking · Jornada da sessão' };

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ anonymousId?: string }>;
}) {
  const [{ sessionId }, { anonymousId }, flags] = await Promise.all([params, searchParams, fetchFeatureFlags()]);
  return <SessionJourneyPage sessionId={sessionId} anonymousId={anonymousId ?? ''} trackingEnabled={flags.tracking} />;
}
