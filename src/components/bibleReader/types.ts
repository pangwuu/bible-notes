import { PassageReference, TargetVerseHighlight } from '../../types/note';
import { BibleTranslation } from '../../types/user';
import {
  PassageFetchResult,
  VerseSegment,
  MultiPassageSection,
  buildScriptureHtml,
} from '../../services/bibleService';
import {
  LinkedSectionInfo,
  LinkedVerseData,
} from '../../utils/verseLinkUtils';
import { colors, typography } from '../../constants/theme';

export { buildScriptureHtml };

export const SYSTEM_FONTS = [typography.body.fontFamily];

export interface SectionOption {
  id: string;
  title: string;
  icon?: string;
  color?: string;
}

export interface BibleReaderProps {
  passage: PassageReference;
  activeSegment?: PassageReference | null;
  preferredTranslation?: BibleTranslation;
  preferredVersionId?: number;
  customApiKey?: string;
  initiallyCollapsed?: boolean;
  style?: any;
  fontSize?: number;
  linkedVerseMap?: Record<string | number, LinkedVerseData | LinkedSectionInfo>;
  onAttachToSection?: (verses: number[], sectionId: string, context?: { book?: string; chapter?: number }) => void;
  onJumpToSection?: (sectionId: string) => void;
  targetHighlightedVerse?: TargetVerseHighlight | null;
  sectionOptions?: SectionOption[];
  onFontSizeChange?: (size: number) => void;
  onVerseLayout?: (verseKey: string, y: number) => void;
}

export const DEFAULT_SECTION_OPTIONS: SectionOption[] = [
  { id: 'keyIdea', title: 'Key Idea', icon: 'bulb-outline', color: colors.accent.keyIdea },
  { id: 'question', title: 'Question', icon: 'help-circle-outline', color: colors.accent.question },
  { id: 'application', title: 'Application', icon: 'footsteps-outline', color: colors.accent.application },
];
