import type { Metadata } from 'next';
import { CreateEventPageContent } from '@/features/events';
import { fetchFeatureFlags } from '@/features/feature-flags';

export const metadata: Metadata = { title: 'Novo evento' };

export default async function CreateEventPage() {
  // vod_upload gates the VOD format option in the wizard — off means VOD events
  // can't be created (the backend enforces the same flag on create + upload).
  const flags = await fetchFeatureFlags();
  return <CreateEventPageContent vodUploadEnabled={flags.vod_upload} />;
}
