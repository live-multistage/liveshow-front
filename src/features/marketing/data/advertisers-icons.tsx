import type { ReactNode } from 'react';
import {
  Building2,
  Users,
  Store,
  Handshake,
  Megaphone,
  LayoutGrid,
  Target,
  Tag,
  Calendar,
  Repeat,
  Link2,
  type LucideIcon,
} from 'lucide-react';

export type AdvertiserIconKey =
  | 'brand'
  | 'producer'
  | 'sponsor'
  | 'local'
  | 'layout'
  | 'users'
  | 'target'
  | 'tag'
  | 'calendar'
  | 'repeat'
  | 'link';

const ICONS: Record<AdvertiserIconKey, LucideIcon> = {
  brand: Building2,
  producer: Megaphone,
  sponsor: Handshake,
  local: Store,
  layout: LayoutGrid,
  users: Users,
  target: Target,
  tag: Tag,
  calendar: Calendar,
  repeat: Repeat,
  link: Link2,
};

export function advertiserIcon(key: AdvertiserIconKey, size = 18): ReactNode {
  const Icon = ICONS[key];
  const strokeWidth = size >= 24 ? 1.7 : 2;
  return <Icon size={size} strokeWidth={strokeWidth} />;
}
