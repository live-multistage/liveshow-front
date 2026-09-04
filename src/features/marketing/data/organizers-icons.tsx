import type { ReactNode } from 'react';
import {
  Music,
  Trophy,
  Mic,
  Church,
  Drama,
  BookOpen,
  Video,
  Gauge,
  Volume2,
  Hand,
  Disc,
  Activity,
  Ticket,
  Gift,
  QrCode,
  Tag,
  RotateCcw,
  Users,
  LineChart,
  Eye,
  FileText,
  Table,
  Megaphone,
  type LucideIcon,
} from 'lucide-react';

export type OrganizerIconKey =
  | 'music'
  | 'trophy'
  | 'mic'
  | 'church'
  | 'drama'
  | 'book'
  | 'cams'
  | 'gauge'
  | 'audio'
  | 'hand'
  | 'rec'
  | 'pulse'
  | 'ticket'
  | 'gift'
  | 'qr'
  | 'tag'
  | 'replay'
  | 'users'
  | 'chart'
  | 'eye'
  | 'file'
  | 'ledger'
  | 'ads';

const ICONS: Record<OrganizerIconKey, LucideIcon> = {
  music: Music,
  trophy: Trophy,
  mic: Mic,
  church: Church,
  drama: Drama,
  book: BookOpen,
  cams: Video,
  gauge: Gauge,
  audio: Volume2,
  hand: Hand,
  rec: Disc,
  pulse: Activity,
  ticket: Ticket,
  gift: Gift,
  qr: QrCode,
  tag: Tag,
  replay: RotateCcw,
  users: Users,
  chart: LineChart,
  eye: Eye,
  file: FileText,
  ledger: Table,
  ads: Megaphone,
};

export function organizerIcon(key: OrganizerIconKey, size = 18): ReactNode {
  const Icon = ICONS[key];
  const strokeWidth = size >= 24 ? 1.7 : 2;
  return <Icon size={size} strokeWidth={strokeWidth} />;
}
