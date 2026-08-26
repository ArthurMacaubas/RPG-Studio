import {
  BookMarked,
  UserCog,
  Users,
  Skull,
  Puzzle,
  FileText,
  Search,
  Package,
  CalendarDays,
  BookOpen,
  Map,
  Image,
  Music,
  Video,
  StickyNote,
  MapPin,
  type LucideIcon
} from 'lucide-react';
import type { FileType } from '@/types';

export const FILE_TYPE_ICONS: Record<FileType, LucideIcon> = {
  CAMPAIGN: BookMarked,
  NPC: UserCog,
  CHARACTER: Users,
  THREAT: Skull,
  PUZZLE: Puzzle,
  DOCUMENT: FileText,
  CLUE: Search,
  OBJECT: Package,
  EVENT: CalendarDays,
  SESSION: BookOpen,
  MAP: Map,
  IMAGE: Image,
  AUDIO: Music,
  VIDEO: Video,
  NOTE: StickyNote,
  LOCATION: MapPin
};

export function FileTypeIcon({ type, size = 16 }: { type: FileType; size?: number }) {
  const Icon = FILE_TYPE_ICONS[type];
  return <Icon size={size} />;
}
