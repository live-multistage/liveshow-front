// Pages
export { OrganizationListPage } from './pages/OrganizationListPage';
export { CreateOrganizationPage } from './pages/CreateOrganizationPage';
export { OrganizationDashboardPage } from './pages/OrganizationDashboardPage';
export { MembersPage } from './pages/MembersPage';
export { SettingsPage } from './pages/SettingsPage';
export { PublicPreviewPage } from './pages/PublicPreviewPage';
export { OrganizationPublicPage } from './pages/OrganizationPublicPage';

// Components
export { OrganizationPublicEventCard } from './components/OrganizationPublicEventCard';
export { OrganizationCard } from './components/OrganizationCard';
export { OrganizationList } from './components/OrganizationList';
export { CreateOrganizationButton } from './components/CreateOrganizationButton';
export { OrganizationForm } from './components/OrganizationForm';
export { OrganizationSlugField } from './components/OrganizationSlugField';
export { OrganizationDescriptionField } from './components/OrganizationDescriptionField';
export { OrganizationHeader } from './components/OrganizationHeader';
export { OrganizationStatsCard } from './components/OrganizationStatsCard';
export { RecentActivityCard } from './components/RecentActivityCard';
export { MembersTable } from './components/MembersTable';
export { InviteMemberModal } from './components/InviteMemberModal';
export { MemberRoleSelector } from './components/MemberRoleSelector';
export { RemoveMemberDialog } from './components/RemoveMemberDialog';
export { OrganizationLogoUploader } from './components/OrganizationLogoUploader';
export { OrganizationBannerUploader } from './components/OrganizationBannerUploader';
export { OrganizationsGuard } from './components/OrganizationsGuard';

// Hooks
// useOrganization accepts UUID or slug transparently
export {
  useOrganizations,
  useOrganization,
  useOrganizationBySlug,
  useOrganizationEvents,
  ORGANIZATIONS_KEY,
} from './hooks/use-organizations';
export { useOrganizationMembers } from './hooks/use-organization-members';
export { useOrganizationSettings } from './hooks/use-organization-settings';
export { useOrganizationAnalytics, organizationAnalyticsKey } from './hooks/use-organization-analytics';
export { useCreateOrganization } from './hooks/use-create-organization';
export { useUpdateOrganization } from './hooks/use-update-organization';
export { useInviteMember } from './hooks/use-invite-member';
export { useRemoveMember } from './hooks/use-remove-member';
export { useUpdateMemberRole } from './hooks/use-update-member-role';

// Schemas
export { createOrganizationSchema } from './schemas/create-organization.schema';
export { inviteMemberSchema } from './schemas/invite-member.schema';
export type { CreateOrganizationValues } from './schemas/create-organization.schema';
export type { InviteMemberValues } from './schemas/invite-member.schema';

// Types
export type {
  OrganizationResponse,
  OrganizationMemberResponse,
  OrganizationSettings,
  OrganizationRole,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  InviteMemberRequest,
  UpdateMemberRoleRequest,
  UpdateOrganizationSettingsRequest,
} from './types/organization.types';
export type {
  OrganizationAnalyticsResponse,
  OrganizationAnalyticsFunnel,
  OrganizationAnalyticsCreatorScores,
} from './types/organization-analytics.types';

// Legacy (kept for backward compat with /dashboard/organizations routes)
export { OrganizationsPageContent } from './components/OrganizationsPageContent';
export { OrgDetailPageContent } from './components/OrgDetailPageContent';
export { OrgDetailLoader } from './components/OrgDetailLoader';
export { CreateOrganizationForm } from './components/CreateOrganizationForm';
export { CreateOrganizationPageContent } from './components/CreateOrganizationPageContent';
export { useMyOrganizationsQuery, MY_ORGANIZATIONS_KEY } from './queries/get-my-organizations';
export { useOrgMembersQuery } from './queries/get-members';
export { useCreateOrganizationMutation } from './mutations/create-organization.mutation';
export { useAddMemberMutation } from './mutations/add-member.mutation';
export { useRemoveMemberMutation } from './mutations/remove-member.mutation';
