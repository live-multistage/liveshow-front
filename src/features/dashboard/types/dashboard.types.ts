import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Building2,
  CalendarDays,
  ShoppingCart,
  Radio,
  BarChart2,
} from 'lucide-react';
import type { UserRole } from '@/types';

export interface NavItem {
  navKey: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_BY_ROLE: Record<Exclude<UserRole, 'USER'>, NavItem[]> = {
  ADMIN: [
    { navKey: 'overview',       href: '/dashboard',                icon: LayoutDashboard },
    { navKey: 'organizations',  href: '/dashboard/organizations',  icon: Building2 },
    { navKey: 'events',         href: '/dashboard/events',         icon: CalendarDays },
    { navKey: 'sales',          href: '/dashboard/sales',          icon: ShoppingCart },
    { navKey: 'streams',        href: '/dashboard/streams',        icon: Radio },
    { navKey: 'analytics',      href: '/dashboard/analytics',      icon: BarChart2 },
  ],
  ORGANIZER: [
    { navKey: 'overview',       href: '/dashboard',                icon: LayoutDashboard },
    { navKey: 'organizations',  href: '/dashboard/organizations',  icon: Building2 },
    { navKey: 'events',         href: '/dashboard/events',         icon: CalendarDays },
    { navKey: 'sales',          href: '/dashboard/sales',          icon: ShoppingCart },
    { navKey: 'analytics',      href: '/dashboard/analytics',      icon: BarChart2 },
  ],
  ARTIST: [
    { navKey: 'overview',       href: '/dashboard',                icon: LayoutDashboard },
    { navKey: 'streams',        href: '/dashboard/streams',        icon: Radio },
    { navKey: 'analytics',      href: '/dashboard/analytics',      icon: BarChart2 },
  ],
};

export const DASHBOARD_ROLES: UserRole[] = ['ADMIN', 'ORGANIZER', 'ARTIST'];
