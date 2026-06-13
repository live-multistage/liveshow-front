# Organization Frontend Module - Specification

# Overview

The Organization Frontend Module is responsible for allowing organization owners and team members to manage their organization inside the platform.

This module acts as the administrative workspace for event producers.

Future platform capabilities such as:

* Events
* Ticketing
* Streaming
* Analytics
* Billing
* Advertising

will be managed through the Organization Workspace.

The MVP should establish the foundation for future expansion.

---

# Goals

Allow users to:

* Create organizations
* Manage organization profile
* Invite members
* Manage permissions
* View organization information

Future support:

* Events Management
* Financial Management
* Analytics
* Advertising
* Sponsorships

---

# Routes

## Organizations List

```text
/organizations
```

Purpose:

List all organizations where the current user belongs.

---

## Create Organization

```text
/organizations/new
```

Purpose:

Create a new organization.

---

## Organization Dashboard

```text
/organizations/:organizationId
```

Purpose:

Organization overview page.

---

## Members Management

```text
/organizations/:organizationId/members
```

Purpose:

Manage organization members.

---

## Organization Settings

```text
/organizations/:organizationId/settings
```

Purpose:

Manage organization information.

---

## Organization Public Preview

```text
/organizations/:organizationId/public
```

Purpose:

Preview public organization profile.

---

# Feature Structure

```text
features/

organizations/

├── pages/
│
├── components/
│
├── hooks/
│
├── services/
│
├── schemas/
│
├── types/
│
└── routes/
```

---

# Pages

## OrganizationListPage

Route:

```text
/organizations
```

Responsibilities:

* List organizations
* Navigate to organization dashboard
* Create organization

---

### Components

```text
OrganizationCard

OrganizationList

CreateOrganizationButton
```

---

# CreateOrganizationPage

Route:

```text
/organizations/new
```

Responsibilities:

* Organization creation

---

### Form Fields

```text
Organization Name

Slug

Description
```

---

### Components

```text
OrganizationForm

OrganizationSlugField

OrganizationDescriptionField
```

---

# OrganizationDashboardPage

Route:

```text
/organizations/:organizationId
```

Purpose:

Central workspace for organization.

---

### Dashboard Sections

```text
Organization Summary

Members Summary

Events Summary

Recent Activity
```

---

### Components

```text
OrganizationHeader

OrganizationStatsCard

RecentActivityCard
```

---

# MembersPage

Route:

```text
/organizations/:organizationId/members
```

Purpose:

Manage organization members.

---

### Features

* List members
* Invite member
* Remove member
* Change role

---

### Components

```text
MembersTable

InviteMemberModal

MemberRoleSelector

RemoveMemberDialog
```

---

# SettingsPage

Route:

```text
/organizations/:organizationId/settings
```

Purpose:

Manage organization information.

---

### Sections

```text
General

Branding

Contact Information

Identity Information
```

---

# General Settings

Fields:

```text
Organization Name

Slug

Description
```

---

# Branding Settings

Fields:

```text
Logo

Banner
```

---

### Components

```text
OrganizationLogoUploader

OrganizationBannerUploader
```

---

# Contact Information

Fields:

```text
Email

Support Email

Phone
```

---

# Identity Information

Fields:

```text
Legal Name

Document Number

Country

State

City

Timezone
```

---

# Public Preview Page

Route:

```text
/organizations/:organizationId/public
```

Purpose:

Preview public organization page.

---

### Sections

```text
Logo

Banner

Organization Description

Upcoming Events
```

---

# Navigation Structure

```text
Organization Dashboard

├── Overview
├── Members
├── Settings
└── Public Profile
```

Future:

```text
├── Events
├── Tickets
├── Analytics
├── Billing
└── Advertisements
```

---

# Data Fetching

Use:

```text
TanStack Query
```

Required Queries:

```typescript
useOrganizations()

useOrganization()

useOrganizationMembers()

useOrganizationSettings()
```

---

# Mutations

Required Mutations:

```typescript
useCreateOrganization()

useUpdateOrganization()

useInviteMember()

useRemoveMember()

useUpdateMemberRole()
```

---

# Services

```text
organization.service.ts

organization-members.service.ts

organization-settings.service.ts
```

---

# Forms

Stack:

```text
React Hook Form
+
Zod
```

---

# Validation

## Organization Creation

Rules:

```text
Name Required

Slug Required

Slug Unique

Description Optional
```

---

# Member Invitation

Rules:

```text
Valid Email

Role Required
```

---

# Permissions

## OWNER

Can:

* Manage organization
* Manage members
* Transfer ownership
* Delete organization

---

## ADMIN

Can:

* Manage members
* Update settings

---

## EVENT_MANAGER

Can:

* View organization
* Future event management

---

## VIEWER

Can:

* Read-only access

````

---

# State Management

## Local State

Use:

```text
useState
````

Examples:

* Modal state
* Form state
* Filters

---

## Server State

Use:

```text
TanStack Query
```

Examples:

* Organizations
* Members
* Settings

---

# Error Handling

Every page must support:

```text
Loading

Success

Error

Empty State
```

---

# Testing

## Unit Tests

Focus:

* Hooks
* Validation
* Utilities

---

## Component Tests

Focus:

* Forms
* Modals
* Permission rendering

---

## Integration Tests

Focus:

* Organization creation
* Member invitation flow
* Settings update flow

---

# MVP Success Criteria

Users must be able to:

* Create organizations
* Edit organization information
* Upload branding assets
* Invite members
* Manage member roles
* View public profile preview

The module must be prepared for future integration with:

* Events
* Ticketing
* Streaming
* Analytics
* Billing
* Advertisement Management

without requiring architectural changes.
