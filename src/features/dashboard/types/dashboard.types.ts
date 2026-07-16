import { createElement, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  LayoutGrid,
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
  // Section header shown above the item when it differs from the previous
  // item's group. Used by the grouped super-admin sidebar; omit for flat navs.
  group?: string;
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
  // Grouped nav (design: Liveshow Super Admin Global.dc.html). Only live
  // routes are listed; future specs (financeiro/operacional/governança) append
  // their own groups + items here as they ship.
  SUPER_ADMIN: [
    { navKey: 'overviewGlobal',        href: '/dashboard',                        icon: LayoutGrid,  group: 'PLATAFORMA' },
    { navKey: 'platformOrganizations', href: '/dashboard/platform/organizations', icon: Building2,    group: 'PLATAFORMA', badge: () => createElement(PendingOrgsBadge) },
    { navKey: 'platformUsers',         href: '/dashboard/platform/users',         icon: Users,        group: 'PLATAFORMA' },
  ],
};

export const DASHBOARD_ROLES: UserRole[] = ['ADMIN', 'ORGANIZER', 'ARTIST', 'SUPER_ADMIN'];
