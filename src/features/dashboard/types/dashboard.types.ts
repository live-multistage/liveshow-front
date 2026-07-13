import { createElement, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Building2,
  CalendarDays,
  ShoppingCart,
  Radio,
  BarChart2,
  Ticket,
  Megaphone,
  ShieldCheck,
  Users,
} from 'lucide-react';
import type { UserRole } from '@/types';
import { PendingOrgsBadge } from '@/features/platform-admin/components/PendingOrgsBadge';

export interface NavItem {
  navKey: string;
  href: string;
  icon: LucideIcon;
  badge?: () => ReactNode;
}

export const NAV_BY_ROLE: Record<Exclude<UserRole, 'USER'>, NavItem[]> = {
  ADMIN: [
    { navKey: 'overview',       href: '/dashboard',                icon: LayoutDashboard },
    { navKey: 'organizations',  href: '/dashboard/organizations',  icon: Building2 },
    { navKey: 'events',         href: '/dashboard/events',         icon: CalendarDays },
    { navKey: 'sales',          href: '/dashboard/sales',          icon: ShoppingCart },
    { navKey: 'coupons',        href: '/dashboard/coupons',        icon: Ticket },
    { navKey: 'streams',        href: '/dashboard/streams',        icon: Radio },
    { navKey: 'analytics',      href: '/dashboard/analytics',      icon: BarChart2 },
    { navKey: 'advertisement',  href: '/dashboard/advertisement',  icon: Megaphone },
  ],
  ORGANIZER: [
    { navKey: 'overview',       href: '/dashboard',                icon: LayoutDashboard },
    { navKey: 'organizations',  href: '/dashboard/organizations',  icon: Building2 },
    { navKey: 'events',         href: '/dashboard/events',         icon: CalendarDays },
    { navKey: 'sales',          href: '/dashboard/sales',          icon: ShoppingCart },
    { navKey: 'coupons',        href: '/dashboard/coupons',        icon: Ticket },
    { navKey: 'streams',        href: '/dashboard/streams',        icon: Radio },
    { navKey: 'analytics',      href: '/dashboard/analytics',      icon: BarChart2 },
    { navKey: 'advertisement',  href: '/dashboard/advertisement',  icon: Megaphone },
  ],
  ARTIST: [
    { navKey: 'overview',       href: '/dashboard',                icon: LayoutDashboard },
    { navKey: 'streams',        href: '/dashboard/streams',        icon: Radio },
    { navKey: 'analytics',      href: '/dashboard/analytics',      icon: BarChart2 },
  ],
  SUPER_ADMIN: [
    { navKey: 'platformOrganizations', href: '/dashboard/platform/organizations', icon: ShieldCheck, badge: () => createElement(PendingOrgsBadge) },
    { navKey: 'platformUsers',         href: '/dashboard/platform/users',        icon: Users },
  ],
};

export const DASHBOARD_ROLES: UserRole[] = ['ADMIN', 'ORGANIZER', 'ARTIST', 'SUPER_ADMIN'];
