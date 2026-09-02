// The ad-partnership queries/mutations are shared between the organizer
// dashboard card and this platform-admin queue, so the implementation lives
// in the `ad-partner` feature. Re-exported here to match this feature's
// `queries/get-*.ts` layout and keep import sites within platform-admin
// consistent with its sibling queries.
export {
  useAdPartnershipsQuery,
  useReviewPartnershipMutation,
  useSetPartnershipRateMutation,
} from '@/features/ad-partner/queries/use-ad-partnership';
