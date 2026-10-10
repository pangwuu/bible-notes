import { PassageSegment, PassageReference } from '../../types/note';
import { CanonicalBook } from '../../constants/bibleData';

export type PickerStep = 'book' | 'start_chapter' | 'start_verse' | 'end_chapter' | 'end_verse';

export interface PassageSelection {
  display: string;
  displayString: string;
  books: string[];
  segments: PassageSegment[];
  book: string;
  startChapter: number;
  startVerse: number;
  endChapter: number;
  endVerse: number;
}

export interface PassagePickerProps {
  visible: boolean;
  onClose?: () => void;
  onDismiss?: () => void;
  initialPassage?: PassageReference | {
    book?: string;
    startChapter?: number;
    startVerse?: number;
    endChapter?: number;
    endVerse?: number;
    segments?: PassageSegment[];
  };
  onSelect: (passage: PassageSelection) => void;
}

export interface PassagePickerState {
  step: PickerStep;
  selectedBook: string | null;
  selectedChapter: number | null;
  selectedChapterEnd: number | null;
  selectedVerseStart: number | null;
  selectedVerseEnd: number | null;
  /** Verse waiting for a second tap to finish a same-chapter range. */
  verseAnchor: number | null;
  /** Index of the committed passage currently being edited, if any. */
  editingIndex: number | null;
  /** Book whose chapter grid is open in the accordion. */
  expandedBook: string | null;
  segments: PassageSegment[];
  testamentTab: 'OT' | 'NT';
  searchQuery: string;
  smartParseError: string | null;
}

export type PassagePickerAction =
  | {
      type: 'SYNC_INITIAL';
      payload: {
        visible: boolean;
        initialPassage?: PassageReference | {
          book?: string;
          startChapter?: number;
          startVerse?: number;
          endChapter?: number;
          endVerse?: number;
          segments?: PassageSegment[];
        };
      };
    }
  | { type: 'SELECT_BOOK'; payload: { book: CanonicalBook } }
  | { type: 'SELECT_START_CHAPTER'; payload: { chapter: number } }
  | { type: 'SELECT_START_VERSE'; payload: { verse: number } }
  | { type: 'SELECT_END_CHAPTER'; payload: { chapter: number } }
  | { type: 'SELECT_END_VERSE'; payload: { verse: number } }
  | { type: 'SELECT_ENTIRE_CHAPTER'; payload: { totalVerses: number } }
  | { type: 'SELECT_RANGE_VERSE'; payload: { verse: number } }
  | { type: 'ADD_SEGMENT'; payload: { segment: PassageSegment } }
  | { type: 'ADD_SEGMENTS'; payload: { segments: PassageSegment[] } }
  | { type: 'REMOVE_SEGMENT'; payload: { index: number } }
  | { type: 'MOVE_SEGMENT'; payload: { index: number; direction: 'up' | 'down' } }
  | { type: 'START_EDIT'; payload: { index: number } }
  | { type: 'SAVE_EDIT' }
  | { type: 'CANCEL_EDIT' }
  | { type: 'STEP_BACK' }
  | { type: 'SET_STEP'; payload: { step: PickerStep; expandedBook?: string | null } }
  | { type: 'RESET' }
  | { type: 'SET_TESTAMENT'; payload: { testament: 'OT' | 'NT' } }
  | { type: 'SET_SEARCH_QUERY'; payload: { query: string } };
