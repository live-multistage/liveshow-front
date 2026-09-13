import { MAILING_AUDIENCE_SPECS, type MailingAudience, type MailingAudienceParamKind } from '@live-show/api-contracts';

type Translator = (key: string, vars?: Record<string, unknown>) => string;

// Raw ids (uuids) aren't user-friendly without a name lookup we don't have here, so
// id-kind params show a truncated id instead of the full uuid.
const ID_KINDS = new Set<MailingAudienceParamKind>(['eventId', 'channelId', 'organizationId', 'artistId']);

/** "type label · param: value · …" summary for the wizard review step and campaign detail page. */
export function describeAudience(audience: MailingAudience, t: Translator): string {
  const spec = MAILING_AUDIENCE_SPECS[audience.type];
  const record = audience as unknown as Record<string, string | number | undefined>;

  const parts = Object.entries(spec)
    .map(([key, paramSpec]) => {
      const raw = record[key];
      if (raw === undefined || raw === '') return null;
      const shown = ID_KINDS.has(paramSpec.kind) ? `${String(raw).slice(0, 8)}…`
        : paramSpec.kind === 'eventCategory' ? t(`audience.eventCategory.${raw}`)
          : paramSpec.kind === 'applicationKind' ? t(`audience.applicationKind.${raw}`)
            : paramSpec.kind === 'applicationStatus' ? t(`audience.applicationStatus.${raw}`)
              : String(raw);
      return `${t(`audience.param.${key}`)}: ${shown}`;
    })
    .filter((part): part is string => part !== null);

  if (audience.country) parts.push(audience.country);

  const typeLabel = t(`audience.type.${audience.type}`);
  return parts.length ? `${typeLabel} · ${parts.join(' · ')}` : typeLabel;
}
