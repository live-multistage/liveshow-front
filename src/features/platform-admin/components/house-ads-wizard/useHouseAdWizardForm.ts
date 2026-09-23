import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { AgeBracket } from '@live-show/api-contracts';
import {
  HOUSE_AD_PLACEMENT_ACCEPTED_FORMATS,
  useCreateHouseAdMutation,
  useUpdateHouseAdMutation,
  useUploadHouseAdBannerMutation,
  useUploadHouseAdVideoMutation,
  useChangeHouseAdStatusMutation,
  useHouseAdQuery,
  type CreateHouseAdRequest,
  type HouseAdDetail,
  type HouseAdFormat,
  type HouseAdListItem,
  type HouseAdPlacement,
  type HouseAdPriority,
  type HouseAdFrequencyCapWindow,
  type UpdateHouseAdRequest,
} from '../../house-ads';
import { isVideoFormat, validateCreativeFile } from './upload-limits';

export type WizardStep = 1 | 2 | 3 | 4;

export type DestinationMode = 'EVENT' | 'EXTERNAL_URL';

export interface WizardDraft {
  title: string;
  format: HouseAdFormat | null;
  destinationMode: DestinationMode;
  destinationEventId: string;
  destinationEventTitle: string;
  destinationUrl: string;
  creativeFile: File | null;
  creativeFileName: string | null;
  creativeError: string | null;
  placements: HouseAdPlacement[];
  targetDomains: string[];
  targetCategories: string[];
  targetAgeBrackets: AgeBracket[];
  frequencyCapMax: string;
  frequencyCapWindow: HouseAdFrequencyCapWindow;
  startsAt: string;
  endsAt: string;
  housePriority: HouseAdPriority;
  /** Existing banner/video URL from the detail fetch. Display-only — never
   * sent back; a replacement upload is the only way to change the creative. */
  existingCreativeUrl: string | null;
}

const EMPTY_DRAFT: WizardDraft = {
  title: '',
  format: null,
  destinationMode: 'EVENT',
  destinationEventId: '',
  destinationEventTitle: '',
  destinationUrl: '',
  creativeFile: null,
  creativeFileName: null,
  creativeError: null,
  placements: [],
  targetDomains: [],
  targetCategories: [],
  targetAgeBrackets: [],
  frequencyCapMax: '',
  frequencyCapWindow: 'day',
  startsAt: '',
  endsAt: '',
  housePriority: 'FILL',
  existingCreativeUrl: null,
};

// The list row (the only thing available before the detail fetch resolves)
// doesn't carry targeting, frequency cap or the creative file, so this only
// prefills what T2's row actually has. mergeDetailIntoDraft fills the rest
// once GET /house-ads/:id comes back.
function draftFromAd(ad: HouseAdListItem): WizardDraft {
  return {
    ...EMPTY_DRAFT,
    title: ad.title,
    format: ad.format,
    destinationMode: ad.destination?.type === 'EXTERNAL_URL' ? 'EXTERNAL_URL' : 'EVENT',
    destinationEventId: ad.destination?.type === 'EVENT' ? ad.destination.eventId : '',
    destinationEventTitle: '',
    destinationUrl: ad.destination?.type === 'EXTERNAL_URL' ? ad.destination.url : '',
    placements: ad.placements,
    startsAt: ad.startsAt.slice(0, 16),
    endsAt: ad.endsAt.slice(0, 16),
    housePriority: ad.housePriority ?? 'FILL',
  };
}

// Fills in the fields only the detail endpoint carries. Called once the
// GET /house-ads/:id fetch resolves in edit mode.
function mergeDetailIntoDraft(draft: WizardDraft, detail: HouseAdDetail): WizardDraft {
  return {
    ...draft,
    targetDomains: detail.targetDomains,
    targetCategories: detail.targetCategories,
    targetAgeBrackets: detail.targetAgeBrackets,
    frequencyCapMax: detail.frequencyCapMax != null ? String(detail.frequencyCapMax) : draft.frequencyCapMax,
    frequencyCapWindow: detail.frequencyCapWindow ?? draft.frequencyCapWindow,
    existingCreativeUrl: detail.bannerUrl ?? detail.videoUrl ?? null,
  };
}

const HTTPS_RE = /^https:\/\/.+/i;

export function isValidHttpsUrl(value: string): boolean {
  return HTTPS_RE.test(value.trim());
}

export function step1Valid(draft: WizardDraft, isEdit: boolean): boolean {
  if (!draft.title.trim() || draft.title.length > 80) return false;
  if (!draft.format) return false;
  if (draft.destinationMode === 'EVENT' && !draft.destinationEventId) return false;
  if (draft.destinationMode === 'EXTERNAL_URL' && !isValidHttpsUrl(draft.destinationUrl)) return false;
  if (draft.creativeError) return false;
  // A brand-new ad has no creative on the server yet; editing one keeps the
  // existing creative unless the admin picks a replacement.
  if (!isEdit && !draft.creativeFile) return false;
  return true;
}

export function step2Valid(draft: WizardDraft): boolean {
  if (draft.placements.length === 0) return false;
  if (draft.frequencyCapMax && (!/^\d+$/.test(draft.frequencyCapMax) || Number(draft.frequencyCapMax) <= 0)) return false;
  return true;
}

export function step3Valid(draft: WizardDraft): boolean {
  if (!draft.startsAt || !draft.endsAt) return false;
  return new Date(draft.endsAt).getTime() > new Date(draft.startsAt).getTime();
}

// datetime-local ('YYYY-MM-DDTHH:mm') has no timezone; the browser's local
// zone is what the admin sees and means, so that's what we send.
function localToIso(local: string): string {
  return new Date(local).toISOString();
}

function destinationOf(draft: WizardDraft) {
  return draft.destinationMode === 'EVENT'
    ? { type: 'EVENT' as const, eventId: draft.destinationEventId }
    : { type: 'EXTERNAL_URL' as const, url: draft.destinationUrl.trim() };
}

// Create always sends the full targeting the wizard collected — there's
// nothing to preserve yet.
export function buildCreatePayload(draft: WizardDraft): CreateHouseAdRequest {
  return {
    title: draft.title.trim(),
    format: draft.format as HouseAdFormat,
    destination: destinationOf(draft),
    placements: draft.placements,
    targetDomains: draft.targetDomains,
    targetCategories: draft.targetCategories,
    ...(draft.targetAgeBrackets.length > 0 ? { targetAgeBrackets: draft.targetAgeBrackets } : {}),
    ...(draft.frequencyCapMax ? { frequencyCapMax: Number(draft.frequencyCapMax), frequencyCapWindow: draft.frequencyCapWindow } : {}),
    housePriority: draft.housePriority,
    startsAt: localToIso(draft.startsAt),
    endsAt: localToIso(draft.endsAt),
  };
}

// PATCH is Partial on the backend — every field here is optional there.
// targetDomains/targetCategories only ever get real values from the detail
// fetch (the list row never carries them), so they're only sent once that
// fetch has actually loaded; otherwise omitting them means "leave as is"
// instead of silently wiping them with an empty array. targetAgeBrackets and
// the frequency cap are already safe: an unloaded/untouched value is falsy
// and gets omitted the same way.
export function buildUpdatePayload(draft: WizardDraft, targetingLoaded: boolean): UpdateHouseAdRequest {
  return {
    title: draft.title.trim(),
    format: draft.format as HouseAdFormat,
    destination: destinationOf(draft),
    placements: draft.placements,
    ...(targetingLoaded ? { targetDomains: draft.targetDomains, targetCategories: draft.targetCategories } : {}),
    ...(draft.targetAgeBrackets.length > 0 ? { targetAgeBrackets: draft.targetAgeBrackets } : {}),
    ...(draft.frequencyCapMax ? { frequencyCapMax: Number(draft.frequencyCapMax), frequencyCapWindow: draft.frequencyCapWindow } : {}),
    housePriority: draft.housePriority,
    startsAt: localToIso(draft.startsAt),
    endsAt: localToIso(draft.endsAt),
  };
}

interface UseHouseAdWizardFormOptions {
  ad: HouseAdListItem | null;
  open: boolean;
  onSaved: () => void;
}

export function useHouseAdWizardForm({ ad, open, onSaved }: UseHouseAdWizardFormOptions) {
  const isEdit = ad !== null;
  const [step, setStep] = useState<WizardStep>(1);
  const [draft, setDraft] = useState<WizardDraft>(() => (ad ? draftFromAd(ad) : EMPTY_DRAFT));
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // targetingLoaded gates both the update payload (never send targeting that
  // wasn't actually loaded) and whether the admin can save at all in edit
  // mode. Create mode has nothing to load, so it starts true.
  const [targetingLoaded, setTargetingLoaded] = useState(!isEdit);

  const createAd = useCreateHouseAdMutation();
  const updateAd = useUpdateHouseAdMutation();
  const uploadBanner = useUploadHouseAdBannerMutation();
  const uploadVideo = useUploadHouseAdVideoMutation();
  const changeStatus = useChangeHouseAdStatusMutation();
  const detailQuery = useHouseAdQuery(ad?.id ?? null);
  const detailLoading = isEdit && detailQuery.isLoading;
  const detailError = isEdit && detailQuery.isError;

  // Re-seed whenever the dialog is (re)opened for a given ad, so a previous
  // draft never leaks into the next open.
  useEffect(() => {
    if (!open) return;
    setDraft(ad ? draftFromAd(ad) : EMPTY_DRAFT);
    setStep(1);
    setSubmitError(null);
    setTargetingLoaded(!ad);
  }, [open, ad]);

  // Prefill targeting, frequency cap and the creative preview once the
  // detail fetch resolves. Never runs for create (isEdit false).
  useEffect(() => {
    if (!isEdit || !detailQuery.data) return;
    setDraft((prev) => mergeDetailIntoDraft(prev, detailQuery.data));
    setTargetingLoaded(true);
  }, [isEdit, detailQuery.data]);

  function update<K extends keyof WizardDraft>(key: K, value: WizardDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function setFormat(format: HouseAdFormat) {
    setDraft((prev) => ({
      ...prev,
      format,
      // Drop placements the new format no longer supports instead of letting
      // an invalid combination reach step 2.
      placements: prev.placements.filter((p) => HOUSE_AD_PLACEMENT_ACCEPTED_FORMATS[p].includes(format)),
    }));
  }

  async function setCreativeFile(file: File | null) {
    if (!file) {
      update('creativeFile', null);
      update('creativeFileName', null);
      update('creativeError', null);
      return;
    }
    if (!draft.format) return;
    update('creativeFile', file);
    update('creativeFileName', file.name);
    update('creativeError', null);
    const error = await validateCreativeFile(file, draft.format);
    setDraft((prev) => (prev.creativeFile === file ? { ...prev, creativeError: error } : prev));
  }

  function togglePlacement(placement: HouseAdPlacement) {
    setDraft((prev) => ({
      ...prev,
      placements: prev.placements.includes(placement)
        ? prev.placements.filter((p) => p !== placement)
        : [...prev.placements, placement],
    }));
  }

  const canProceed = useMemo(() => {
    // Never let the admin move forward (or save) on a form that hasn't
    // loaded the existing ad yet, or failed to — that's exactly the empty
    // draft that would wipe targeting on submit.
    if (detailLoading || detailError) return false;
    if (step === 1) return step1Valid(draft, isEdit);
    if (step === 2) return step2Valid(draft);
    if (step === 3) return step3Valid(draft);
    return true;
  }, [step, draft, isEdit, detailLoading, detailError]);

  function next() {
    if (!canProceed) return;
    setStep((s) => (s < 4 ? ((s + 1) as WizardStep) : s));
  }

  function back() {
    setStep((s) => (s > 1 ? ((s - 1) as WizardStep) : s));
  }

  async function uploadCreativeIfAny(id: string) {
    if (!draft.creativeFile || !draft.format) return;
    if (isVideoFormat(draft.format)) {
      await uploadVideo.mutateAsync({ id, file: draft.creativeFile });
      return;
    }
    await uploadBanner.mutateAsync({ id, file: draft.creativeFile });
  }

  async function submit() {
    // Belt and suspenders: canProceed already blocks the button, but submit()
    // itself must never fire an update built from an unloaded draft.
    if (isEdit && !targetingLoaded) {
      setSubmitError('Não foi possível carregar os dados do anúncio. Tente novamente.');
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    try {
      if (isEdit && ad) {
        await updateAd.mutateAsync({ id: ad.id, payload: buildUpdatePayload(draft, targetingLoaded) });
        await uploadCreativeIfAny(ad.id);
        toast.success('Alterações salvas.');
      } else {
        const created = await createAd.mutateAsync(buildCreatePayload(draft));
        await uploadCreativeIfAny(created.id);
        await changeStatus.mutateAsync({ id: created.id, action: 'publish' });
        toast.success('Anúncio publicado.');
      }
      onSaved();
    } catch (err) {
      const message = (err as { message?: string })?.message ?? 'Não foi possível publicar o anúncio.';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return {
    isEdit,
    step,
    draft,
    canProceed,
    detailLoading,
    detailError,
    submitting,
    submitError,
    update,
    setFormat,
    setCreativeFile,
    togglePlacement,
    next,
    back,
    goToStep: setStep,
    submit,
  };
}
