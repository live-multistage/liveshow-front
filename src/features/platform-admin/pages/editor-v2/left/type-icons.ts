import {
  Blocks, CalendarDays, CircleHelp, Columns2, CreditCard, Hash, Heading, Image, ListChecks, Minus, MousePointerClick, MoveVertical,
  Radio, Rows3, Star, StretchHorizontal, Tag, Type, Video, type LucideIcon,
} from 'lucide-react';
import type { ElementType } from '@live-show/api-contracts';

export const TYPE_ICONS: Record<ElementType, LucideIcon> = {
  section: Rows3, columns: Columns2, column: Blocks, group: StretchHorizontal,
  heading: Heading, text: Type, label: Tag, button: MousePointerClick, image: Image, video: Video, divider: Minus, spacer: MoveVertical,
  iconList: ListChecks, counter: Hash, faq: CircleHelp, plan: CreditCard,
  eventRail: CalendarDays, featuredEvent: Star, liveNow: Radio,
};
