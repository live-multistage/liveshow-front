import { createElement, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  LayoutGrid,
  Building2,
  CalendarDays,
  ShoppingCart,
  Radio,
  Tv,
  Repeat,
  BarChart2,
  Ticket,
  Megaphone,
  ShieldCheck,
  Users,
  DollarSign,
  Wallet,
  Tag,
  Settings,
} from 'lucide-react';
import type { UserRole } from '@/types';
import { PendingOrgsBadge } from '@/features/platform-admin/components/PendingOrgsBadge';
import { config } from '@/config';

export interface NavItem {
  navKey: string;
  href: string;
  icon: LucideIcon;
  external?: boolean;
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
    { navKey: 'channels',       href: '/dashboard/channels',       icon: Tv },
    { navKey: 'series',         href: '/dashboard/series',         icon: Repeat },
    { navKey: 'analytics',      href: '/dashboard/analytics',      icon: BarChart2 },
    { navKey: 'advertisement',  href: config.adsManagerUrl,        icon: Megaphone, external: true },
  ],
  ORGANIZER: [
    { navKey: 'overview',       href: '/dashboard',                icon: LayoutDashboard },
    { navKey: 'organizations',  href: '/dashboard/organizations',  icon: Building2 },
    { navKey: 'events',         href: '/dashboard/events',         icon: CalendarDays },
    { navKey: 'sales',          href: '/dashboard/sales',          icon: ShoppingCart },
    { navKey: 'coupons',        href: '/dashboard/coupons',        icon: Ticket },
    { navKey: 'streams',        href: '/dashboard/streams',        icon: Radio },
    { navKey: 'channels',       href: '/dashboard/channels',       icon: Tv },
    { navKey: 'series',         href: '/dashboard/series',         icon: Repeat },
    { navKey: 'analytics',      href: '/dashboard/analytics',      icon: BarChart2 },
    { navKey: 'advertisement',  href: config.adsManagerUrl,        icon: Megaphone, external: true },
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
    { navKey: 'platformEvents',        href: '/dashboard/platform/events',        icon: CalendarDays, group: 'PLATAFORMA' },
    { navKey: 'platformRevenue',       href: '/dashboard/platform/revenue',       icon: DollarSign,   group: 'FINANCEIRO' },
    { navKey: 'platformPayouts',       href: '/dashboard/platform/payouts',       icon: Wallet,       group: 'FINANCEIRO' },
    { navKey: 'platformStreams',       href: '/dashboard/platform/streams',       icon: Radio,        group: 'OPERACIONAL' },
    { navKey: 'platformAds',           href: '/dashboard/platform/ads',           icon: Megaphone,    group: 'OPERACIONAL' },
    { navKey: 'platformCoupons',       href: '/dashboard/platform/coupons',       icon: Tag,          group: 'OPERACIONAL' },
    { navKey: 'platformSettings',      href: '/dashboard/platform/settings',      icon: Settings,     group: 'CONFIG & GOVERNANÇA' },
    { navKey: 'platformAudit',         href: '/dashboard/platform/audit',         icon: ShieldCheck,  group: 'CONFIG & GOVERNANÇA' },
  ],
};

export const DASHBOARD_ROLES: UserRole[] = ['ADMIN', 'ORGANIZER', 'ARTIST', 'SUPER_ADMIN'];

// The mobile bottom-nav shows a curated subset (max 5) of each role's nav,
// by navKey. Order here is the on-screen order; labels come from
// dashboard.navMobile.<navKey>. External items are never in the bottom bar.
export const MOBILE_NAV_BY_ROLE: Record<Exclude<UserRole, 'USER'>, string[]> = {
  // `organizations` fica de fora no mobile (cabem 5): é uma tela de gestão
  // pontual, enquanto `analytics` é consulta rotineira e estava sumindo do
  // bottom nav sem substituto.
  ADMIN: ['overview', 'events', 'streams', 'channels', 'analytics'],
  ORGANIZER: ['overview', 'events', 'streams', 'channels', 'analytics'],
  ARTIST: ['overview', 'streams', 'analytics'],
  SUPER_ADMIN: ['overviewGlobal', 'platformOrganizations', 'platformEvents', 'platformStreams', 'platformRevenue'],
};
