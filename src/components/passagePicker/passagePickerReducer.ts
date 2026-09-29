import { findCanonicalBook, CANONICAL_BOOKS, CanonicalBook } from '../../constants/bibleData';
import { parsePassageReferenceString } from '../../utils/passageParser';
import { PassagePickerState, PassagePickerAction } from './passagePickerTypes';
import { getChapterVerseCount } from './passagePickerUtils';

export const initialPickerState: PassagePickerState = {
  step: 'book',
  selectedBook: null,
  selectedChapter: null,
  selectedChapterEnd: null,
  selectedVerseStart: null,
  selectedVerseEnd: null,
  segments: [],
  testamentTab: 'NT',
  searchQuery: '',
  smartParseError: null,
};

export function passagePickerReducer(
  state: PassagePickerState,
  action: PassagePickerAction
): PassagePickerState {
  switch (action.type) {
    case 'SYNC_INITIAL': {
      const { visible, initialPassage } = action.payload;
      if (!visible) {
        return state;
      }

      const initPassage = initialPassage as any;
      if (initPassage?.segments && Array.isArray(initPassage.segments) && initPassage.segments.length > 0) {
        const first = initPassage.segments[0];
        const bookMeta = findCanonicalBook(first.book);
        return {
          ...state,
          step: 'book',
          segments: initPassage.segments,
          selectedBook: first.book,
          selectedChapter: first.startChapter,
          selectedChapterEnd: first.endChapter,
          selectedVerseStart: first.startVerse,
          selectedVerseEnd: first.endVerse,
          testamentTab: bookMeta?.testament ?? 'NT',
          searchQuery: '',
          smartParseError: null,
        };
      } else if (initPassage?.book) {
        const book = initPassage.book;
        const bookMeta = findCanonicalBook(book) || CANONICAL_BOOKS[44];
        const safeStartCh = Math.max(
          1,
          Math.min(initPassage?.startChapter ?? initPassage?.chapter_start ?? 1, bookMeta.chapters)
        );
        const safeEndCh = Math.max(
          safeStartCh,
          Math.min(initPassage?.endChapter ?? initPassage?.chapter_end ?? safeStartCh, bookMeta.chapters)
        );
        const maxStartV = bookMeta.versesPerChapter[safeStartCh - 1];
        const maxEndV = bookMeta.versesPerChapter[safeEndCh - 1];
        const safeStartV =
          initPassage?.startVerse ?? initPassage?.verse_start
            ? Math.max(1, Math.min(initPassage?.startVerse ?? initPassage?.verse_start, maxStartV))
            : null;
        const rawEndV = initPassage?.endVerse ?? initPassage?.verse_end;
        const safeEndV = rawEndV
          ? Math.max(safeStartCh === safeEndCh ? (safeStartV ?? 1) : 1, Math.min(rawEndV, maxEndV))
          : safeStartV;

        return {
          ...state,
          step: 'book',
          segments: [],
          selectedBook: bookMeta.name,
          selectedChapter: safeStartCh,
          selectedChapterEnd: safeEndCh,
          selectedVerseStart: safeStartV,
          selectedVerseEnd: safeEndV,
          testamentTab: bookMeta.testament,
          searchQuery: '',
          smartParseError: null,
        };
      }

      // Clean slate
      return {
        ...initialPickerState,
      };
    }

    case 'SELECT_BOOK': {
      const book = action.payload.book;
      const isSingleChapter = book.chapters === 1;
      return {
        ...state,
        selectedBook: book.name,
        selectedChapter: isSingleChapter ? 1 : null,
        selectedChapterEnd: isSingleChapter ? 1 : null,
        selectedVerseStart: null,
        selectedVerseEnd: null,
        step: isSingleChapter ? 'start_verse' : 'start_chapter',
      };
    }

    case 'SELECT_START_CHAPTER': {
      const ch = action.payload.chapter;
      return {
        ...state,
        selectedChapter: ch,
        selectedChapterEnd: ch,
        selectedVerseStart: null,
        selectedVerseEnd: null,
        step: 'start_verse',
      };
    }

    case 'SELECT_START_VERSE': {
      const v = action.payload.verse;
      return {
        ...state,
        selectedVerseStart: v,
        selectedVerseEnd: v,
        step: 'end_verse',
      };
    }

    case 'SELECT_END_CHAPTER': {
      if (state.selectedChapter === null) return state;
      const ch = action.payload.chapter;
      const safeEndCh = Math.max(state.selectedChapter, ch);
      const maxV = state.selectedBook ? getChapterVerseCount(state.selectedBook, safeEndCh) : 30;
      const safeEndV =
        safeEndCh === state.selectedChapter
          ? Math.max(state.selectedVerseStart ?? 1, state.selectedVerseEnd ?? 1)
          : maxV;

      return {
        ...state,
        selectedChapterEnd: safeEndCh,
        selectedVerseEnd: safeEndV,
        step: 'end_verse',
      };
    }

    case 'SELECT_END_VERSE': {
      const v = action.payload.verse;
      if (state.selectedVerseStart === null) {
        return {
          ...state,
          selectedVerseStart: v,
          selectedVerseEnd: v,
        };
      }

      const isSameChapter = state.selectedChapter === state.selectedChapterEnd;
      const safeV = isSameChapter ? Math.max(state.selectedVerseStart, v) : v;

      return {
        ...state,
        selectedVerseEnd: safeV,
      };
    }

    case 'SELECT_ENTIRE_CHAPTER': {
      if (state.selectedChapter === null) return state;
      return {
        ...state,
        selectedChapterEnd: state.selectedChapter,
        selectedVerseStart: 1,
        selectedVerseEnd: action.payload.totalVerses,
        step: 'end_verse',
      };
    }

    case 'ADD_SEGMENT': {
      return {
        ...state,
        segments: [...state.segments, action.payload.segment],
        selectedBook: null,
        selectedChapter: null,
        selectedChapterEnd: null,
        selectedVerseStart: null,
        selectedVerseEnd: null,
        step: 'book',
      };
    }

    case 'REMOVE_SEGMENT': {
      return {
        ...state,
        segments: state.segments.filter((_, i) => i !== action.payload.index),
      };
    }

    case 'STEP_BACK': {
      const currentBookMeta = state.selectedBook ? findCanonicalBook(state.selectedBook) : null;
      const chapters = currentBookMeta?.chapters ?? 1;

      if (state.step === 'end_verse') {
        if (state.selectedChapter !== state.selectedChapterEnd) {
          return { ...state, step: 'end_chapter' };
        }
        return { ...state, step: 'start_verse' };
      }

      if (state.step === 'end_chapter') {
        return { ...state, step: 'end_verse' };
      }

      if (state.step === 'start_verse') {
        if (chapters === 1) {
          return { ...state, step: 'book' };
        }
        return { ...state, step: 'start_chapter' };
      }

      if (state.step === 'start_chapter') {
        return { ...state, step: 'book' };
      }

      return state;
    }

    case 'SET_STEP': {
      return {
        ...state,
        step: action.payload.step,
      };
    }

    case 'RESET': {
      return {
        ...initialPickerState,
      };
    }

    case 'SET_TESTAMENT': {
      return {
        ...state,
        testamentTab: action.payload.testament,
        searchQuery: '',
      };
    }

    case 'SET_SEARCH_QUERY': {
      const raw = action.payload.query;
      const parsed = parsePassageReferenceString(raw);

      if (parsed.length > 0) {
        const first = parsed[0];
        return {
          ...state,
          searchQuery: raw,
          smartParseError: null,
          segments: parsed,
          selectedBook: first.book,
          selectedChapter: first.startChapter,
          selectedChapterEnd: first.endChapter,
          selectedVerseStart: first.startVerse,
          selectedVerseEnd: first.endVerse,
        };
      }

      return {
        ...state,
        searchQuery: raw,
        smartParseError: null,
      };
    }

    default:
      return state;
  }
}
