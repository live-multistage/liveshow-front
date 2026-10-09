import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SettingsAuditRail } from './SettingsAuditRail';

vi.mock('next-intl', () => ({
  useLocale: () => 'pt',
  useTranslations: () => Object.assign((key: string) => key, { rich: (key: string) => key }),
}));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('../queries/get-settings', () => ({
  isSettingsAuditEntry: () => true,
  useSettingsAuditQuery: () => ({
    data: [
      {
        id: 'a1',
        action: 'LEGAL_DOCUMENT_PUBLISHED',
        targetId: 'TERMS',
        actorName: 'Admin',
        createdAt: '2026-10-09T00:00:00Z',
        metadata: {},
      },
    ],
  }),
}));

describe('SettingsAuditRail', () => {
  it('labels a legal publish as such, not as a fee override', () => {
    render(<SettingsAuditRail />);
    expect(screen.getByText(/legalPublished/)).toBeTruthy();
    expect(screen.queryByText(/feeOverride/)).toBeNull();
  });
});
