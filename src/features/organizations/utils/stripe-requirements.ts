// Maps Stripe Connect requirement/disabled-reason codes to i18n keys.
// Unmapped codes fall back to a prettified version of the raw code so a new
// Stripe requirement never renders as a blank or a raw dotted string.
type Translate = (key: string) => string;

const REQUIREMENT_LABEL_KEYS: Record<string, string> = {
  'individual.verification.document': 'stripeReqIdDocument',
  'individual.verification.additional_document': 'stripeReqIdDocument',
  external_account: 'stripeReqBankAccount',
  'business_profile.url': 'stripeReqBusinessUrl',
  'business_profile.mcc': 'stripeReqBusinessMcc',
  'individual.dob.day': 'stripeReqDob',
  'individual.dob.month': 'stripeReqDob',
  'individual.dob.year': 'stripeReqDob',
  'individual.address.line1': 'stripeReqAddress',
  'individual.address.city': 'stripeReqAddress',
  'individual.address.state': 'stripeReqAddress',
  'individual.address.postal_code': 'stripeReqAddress',
  'individual.first_name': 'stripeReqName',
  'individual.last_name': 'stripeReqName',
  'individual.email': 'stripeReqEmail',
  'individual.phone': 'stripeReqPhone',
  'tos_acceptance.date': 'stripeReqTos',
};

const DISABLED_REASON_KEYS: Record<string, string> = {
  'requirements.past_due': 'stripeDisabledPastDue',
  'requirements.pending_verification': 'stripeDisabledPendingVerification',
};

export function prettifyRequirementCode(code: string): string {
  return code
    .split(/[._]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function requirementLabel(code: string, t: Translate): string {
  const key = REQUIREMENT_LABEL_KEYS[code];
  return key ? t(key) : prettifyRequirementCode(code);
}

export function disabledReasonLabel(reason: string, t: Translate): string {
  const key = DISABLED_REASON_KEYS[reason];
  if (key) return t(key);
  if (reason.startsWith('rejected.')) return t('stripeDisabledRejected');
  return prettifyRequirementCode(reason);
}
