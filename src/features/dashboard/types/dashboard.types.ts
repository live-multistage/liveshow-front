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
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_BY_ROLE: Record<Exclude<UserRole, 'USER'>, NavItem[]> = {
  ADMIN: [
    { label: 'Overview',       href: '/dashboard',                icon: LayoutDashboard },
    { label: 'Organizations',  href: '/dashboard/organizations',  icon: Building2 },
    { label: 'Events',         href: '/dashboard/events',         icon: CalendarDays },
    { label: 'Sales',          href: '/dashboard/sales',          icon: ShoppingCart },
    { label: 'Streams',        href: '/dashboard/streams',        icon: Radio },
    { label: 'Analytics',      href: '/dashboard/analytics',      icon: BarChart2 },
  ],
  ORGANIZER: [
    { label: 'Overview',       href: '/dashboard',                icon: LayoutDashboard },
    { label: 'Organizations',  href: '/dashboard/organizations',  icon: Building2 },
    { label: 'Events',         href: '/dashboard/events',         icon: CalendarDays },
    { label: 'Sales',          href: '/dashboard/sales',          icon: ShoppingCart },
    { label: 'Analytics',      href: '/dashboard/analytics',      icon: BarChart2 },
  ],
  ARTIST: [
    { label: 'Overview',       href: '/dashboard',                icon: LayoutDashboard },
    { label: 'Streams',        href: '/dashboard/streams',        icon: Radio },
    { label: 'Analytics',      href: '/dashboard/analytics',      icon: BarChart2 },
  ],
};

export const DASHBOARD_ROLES: UserRole[] = ['ADMIN', 'ORGANIZER', 'ARTIST'];

export const ROLE_LABEL: Record<Exclude<UserRole, 'USER'>, string> = {
  ADMIN: 'Admin',
  ORGANIZER: 'Organizer',
  ARTIST: 'Artist',
};
