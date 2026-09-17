import { describe, it, expect, vi } from 'vitest';

// The policy is a legal document: every sentence lives in i18n so pt/en/es stay
// in sync. The mock echoes the key, which is what the assertions match on.
vi.mock('next-intl/server', () => ({
  getTranslations: async (namespace: string) => {
    const t = (key: string) => `${namespace}.${key}`;
    t.rich = (key: string) => `${namespace}.${key}`;
    return t;
  },
}));

import { render, screen } from '@testing-library/react';
import PrivacyPolicyPage, { generateMetadata } from './page';

describe('/privacidade', () => {
  it('sets matching openGraph and twitter metadata from i18n', async () => {
    const meta = await generateMetadata();

    expect(meta.title).toBe('legal.privacy.title');
    expect(meta.openGraph?.title).toBe(meta.title);
    expect(meta.openGraph?.url).toBe('/privacidade');
    expect(meta.alternates?.canonical).toBe('/privacidade');
    expect(meta.twitter && 'card' in meta.twitter && meta.twitter.card).toBe('summary_large_image');
  });

  it('renders every mandatory LGPD section heading', async () => {
    render(await PrivacyPolicyPage());

    for (const section of [
      'controller',
      'dataWeCollect',
      'legalBases',
      'sharing',
      'transfers',
      'retention',
      'rights',
      'deletion',
      'consent',
      'minors',
      'security',
      'changes',
      'dpo',
    ]) {
      expect(
        screen.getByRole('heading', { name: `legal.privacy.${section}.title` }),
        section,
      ).toBeInTheDocument();
    }
  });

  it('links to the privacy controls in settings and to the DPO mailbox', async () => {
    render(await PrivacyPolicyPage());

    expect(screen.getByRole('link', { name: 'legal.privacy.rights.settingsLink' })).toHaveAttribute(
      'href',
      '/settings#privacidade',
    );
    // The mock echoes keys, so the address itself is asserted in the
    // i18n-messages suite; here we only prove it is rendered as a mailto link.
    expect(screen.getByRole('link', { name: 'legal.privacy.dpo.email' })).toHaveAttribute(
      'href',
      'mailto:legal.privacy.dpo.email',
    );
  });
});
