import type { MetadataRoute } from 'next';
import { buildRobots } from '@/features/seo/utils/build-robots';
import { getSeoGlobal } from '@/features/seo/queries/get-seo.server';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const global = await getSeoGlobal();
  return buildRobots(global?.robotsExtraRules ?? []);
}
