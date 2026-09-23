import { fetchFeatureFlags } from '@/features/feature-flags';
import { Footer } from './Footer';

// Async server component with NO hooks: it only resolves the flag and hands it
// to the (sync) Footer. Keeping the fetch out of Footer is what lets
// not-found.tsx — which Next prerenders at build time — render the footer
// without any network call.
export async function FooterWithFlags() {
  const flags = await fetchFeatureFlags();
  return <Footer advertisersEnabled={flags.advertiser_platform} />;
}
