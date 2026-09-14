import {
  Bell, Bookmark, BookmarkCheck, CircleHelp, Clock, Database, Flag, GitBranch, GitFork, Globe, Mail, Repeat, Ticket, Timer, User, Zap,
  type LucideIcon,
} from 'lucide-react';
import type { BlueprintNodeKind } from '@live-show/api-contracts';
import styles from './nodeVisuals.module.scss';

const ICON_BY_KEY: Record<string, LucideIcon> = {
  'orders.paid': Zap, 'wishlist.itemAdded': Bookmark, 'events.byId': Database, 'ticketing.hasAccess': Ticket,
  'wishlist.stillSaved': BookmarkCheck, 'account.profile': User, 'core.condition': GitBranch, 'core.waitUntil': Clock,
  'core.end': Flag, 'notifications.inApp': Bell, 'mailing.sendEmail': Mail, 'http.request': Globe, 'core.delay': Timer,
  'core.forEach': Repeat, 'core.switch': GitFork,
};
const ICON_BY_KIND: Record<BlueprintNodeKind, LucideIcon> = { trigger: Zap, data: Database, core: GitBranch, action: Bell };

export const KIND_ORDER: BlueprintNodeKind[] = ['trigger', 'data', 'core', 'action'];
// The minimap paints in JS; the same colors live in nodeVisuals.module.scss.
export const KIND_COLOR: Record<BlueprintNodeKind, string> = { trigger: '#ff2e9e', data: '#46d6d8', core: '#9b7bff', action: '#7fe0a0' };
export const UNKNOWN_COLOR = '#52525b';

/** Sets --kind-color / --kind-soft for the node's type (grey when the node is not in the catalog). */
export const kindClass = (kind?: BlueprintNodeKind) => (kind ? styles[kind] : styles.unknown);

export function NodeIcon({ nodeKey, kind, size = 15 }: { nodeKey: string; kind?: BlueprintNodeKind; size?: number }) {
  const Icon = ICON_BY_KEY[nodeKey] ?? (kind ? ICON_BY_KIND[kind] : CircleHelp);
  return <Icon size={size} aria-hidden />;
}
