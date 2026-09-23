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
  type CreateHouseAdRequest,
  type HouseAdFormat,
  type HouseAdListItem,
  type HouseAdPlacement,
  type HouseAdPriority,
  type HouseAdFrequencyCapWindow,
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
};

// The list endpoint (the only per-ad data this wizard gets — there's no
// GET-one) doesn't return targeting, frequency cap or the creative file, so
// edit mode can only prefill what T2's row actually carries.
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

export function buildPayload(draft: WizardDraft): CreateHouseAdRequest {
  return {
    title: draft.title.trim(),
    format: draft.format as HouseAdFormat,
    destination:
      draft.destinationMode === 'EVENT'
        ? { type: 'EVENT', eventId: draft.destinationEventId }
        : { type: 'EXTERNAL_URL', url: draft.destinationUrl.trim() },
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

  const createAd = useCreateHouseAdMutation();
  const updateAd = useUpdateHouseAdMutation();
  const uploadBanner = useUploadHouseAdBannerMutation();
  const uploadVideo = useUploadHouseAdVideoMutation();
  const changeStatus = useChangeHouseAdStatusMutation();

  // Re-seed whenever the dialog is (re)opened for a given ad, so a previous
  // draft never leaks into the next open.
  useEffect(() => {
    if (!open) return;
    setDraft(ad ? draftFromAd(ad) : EMPTY_DRAFT);
    setStep(1);
    setSubmitError(null);
  }, [open, ad]);

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
    if (step === 1) return step1Valid(draft, isEdit);
    if (step === 2) return step2Valid(draft);
    if (step === 3) return step3Valid(draft);
    return true;
  }, [step, draft, isEdit]);

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
    setSubmitError(null);
    setSubmitting(true);
    try {
      if (isEdit && ad) {
        await updateAd.mutateAsync({ id: ad.id, payload: buildPayload(draft) });
        await uploadCreativeIfAny(ad.id);
        toast.success('Alterações salvas.');
      } else {
        const created = await createAd.mutateAsync(buildPayload(draft));
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
