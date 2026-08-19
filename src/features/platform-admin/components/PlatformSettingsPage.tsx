'use client';

import { PlatformSettingsCard } from '@/features/dashboard/components/PlatformSettingsCard';
import { PlatformPageShell } from './PlatformPageShell';

// D7 — Configurações. Reuses the overview settings card (default fee editable,
// buyer fee CART_TAX_RATE read-only until it moves off env, global feature
// flags). All edits are audited by the existing endpoints.
export function PlatformSettingsPage() {
  return (
    <PlatformPageShell
      group="CONFIG & GOVERNANÇA"
      title="Configurações"
      subtitle="Taxas e feature flags globais da plataforma. Cada alteração é registrada no audit log."
    >
      <div style={{ maxWidth: 560 }}>
        <PlatformSettingsCard />
      </div>
    </PlatformPageShell>
  );
}
