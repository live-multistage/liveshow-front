export type ConsentState = 'granted' | 'denied' | null;

export function effectiveConsent(state: ConsentState): ConsentState {
  if (typeof navigator !== 'undefined') {
    if ((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true) {
      return 'denied';
    }
    if (navigator.doNotTrack === '1') return 'denied';
  }
  return state;
}
