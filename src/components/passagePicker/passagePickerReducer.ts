import { findCanonicalBook, CANONICAL_BOOKS } from '../../constants/bibleData';
import { parsePassageReferenceString, splitSegmentByChapters } from '../../utils/passageParser';
import { PassagePickerState, PassagePickerAction } from './passagePickerTypes';
import {
  getChapterVerseCount,
  appendUniqueSegments,
  assemblePassageSegments,
  draftFromSelection,
} from './passagePickerUtils';

export const initialPickerState: PassagePickerState = {
  step: 'book',
  selectedBook: null,
  selectedChapter: null,
  selectedChapterEnd: null,
  selectedVerseStart: null,
  selectedVerseEnd: null,
  verseAnchor: null,
  editingIndex: null,
  expandedBook: null,
  segments: [],
  testamentTab: 'NT',
  searchQuery: '',
  smartParseError: null,
};

function clearedSelection(state: PassagePickerState, segments = state.segments): PassagePickerState {
  return {
    ...state,
    segments,
    step: 'book',
    selectedBook: null,
    selectedChapter: null,
    selectedChapterEnd: null,
    selectedVerseStart: null,
    selectedVerseEnd: null,
    verseAnchor: null,
    editingIndex: null,
    expandedBook: null,
    searchQuery: '',
    smartParseError: null,
  };
}

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

      const initPassage = initialPassage as {
        segments?: PassagePickerState['segments'];
        book?: string;
        startChapter?: number;
        chapter_start?: number;
        endChapter?: number;
        chapter_end?: number;
        startVerse?: number;
        verse_start?: number;
        endVerse?: number;
        verse_end?: number;
      } | undefined;

      if (initPassage?.segments && Array.isArray(initPassage.segments) && initPassage.segments.length > 0) {
        const normalizedSegments = initPassage.segments.flatMap(splitSegmentByChapters);
        const first = normalizedSegments[0];
        const bookMeta = findCanonicalBook(first.book);
        // Existing passages belong in the list, not as a half-finished draft.
        return {
          ...initialPickerState,
          segments: normalizedSegments,
          testamentTab: bookMeta?.testament ?? 'NT',
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
            ? Math.max(1, Math.min(initPassage?.startVerse ?? initPassage?.verse_start ?? 1, maxStartV))
            : null;
        const rawEndV = initPassage?.endVerse ?? initPassage?.verse_end;
        const safeEndV = rawEndV
          ? Math.max(safeStartCh === safeEndCh ? (safeStartV ?? 1) : 1, Math.min(rawEndV, maxEndV))
          : safeStartV;

        return {
          ...initialPickerState,
          step: safeStartV ? 'end_verse' : 'start_chapter',
          selectedBook: bookMeta.name,
          selectedChapter: safeStartCh,
          selectedChapterEnd: safeEndCh,
          selectedVerseStart: safeStartV,
          selectedVerseEnd: safeEndV,
          expandedBook: bookMeta.name,
          testamentTab: bookMeta.testament,
        };
      }

      return {
        ...initialPickerState,
      };
    }

    case 'SELECT_BOOK': {
      const book = action.payload.book;
      if (state.expandedBook === book.name) {
        return {
          ...state,
          expandedBook: null,
          step: 'book',
        };
      }

      if (state.selectedBook === book.name && state.selectedChapter !== null) {
        return {
          ...state,
          expandedBook: book.name,
          step: book.chapters === 1 ? 'start_verse' : 'start_chapter',
        };
      }

      const isSingleChapter = book.chapters === 1;
      let segments = state.segments;
      const previousDraft = draftFromSelection(state);
      if (
        previousDraft &&
        state.editingIndex === null &&
        state.selectedBook !== book.name
      ) {
        segments = appendUniqueSegments(segments, [previousDraft]);
      }

      return {
        ...state,
        segments,
        selectedBook: book.name,
        selectedChapter: isSingleChapter ? 1 : null,
        selectedChapterEnd: isSingleChapter ? 1 : null,
        selectedVerseStart: null,
        selectedVerseEnd: null,
        verseAnchor: null,
        expandedBook: book.name,
        // Keep the typed query so the book list stays filtered while the
        // user picks a chapter from the results. Clear only via Clear,
        // a successful add/save (clearedSelection), or a picker reset.
        step: isSingleChapter ? 'start_verse' : 'start_chapter',
      };
    }

    case 'SELECT_START_CHAPTER': {
      const ch = action.payload.chapter;
      if (state.selectedChapter === ch && state.selectedVerseStart !== null) {
        return {
          ...state,
          step: 'end_verse',
          verseAnchor: null,
        };
      }

      let segments = state.segments;
      if (
        state.editingIndex === null &&
        state.selectedChapter !== null &&
        state.selectedChapter !== ch &&
        state.selectedVerseStart !== null
      ) {
        const previous = draftFromSelection(state);
        if (previous) {
          segments = appendUniqueSegments(segments, [previous]);
        }
      }

      return {
        ...state,
        segments,
        selectedChapter: ch,
        selectedChapterEnd: ch,
        selectedVerseStart: null,
        selectedVerseEnd: null,
        verseAnchor: null,
        step: 'start_verse',
      };
    }

    case 'SELECT_START_VERSE': {
      const v = action.payload.verse;
      return {
        ...state,
        selectedVerseStart: v,
        selectedVerseEnd: v,
        verseAnchor: v,
        step: 'end_verse',
      };
    }

    case 'SELECT_RANGE_VERSE': {
      const verse = action.payload.verse;
      if (state.selectedChapter === null) return state;

      if (state.verseAnchor === null) {
        return {
          ...state,
          selectedChapterEnd: state.selectedChapter,
          selectedVerseStart: verse,
          selectedVerseEnd: verse,
          verseAnchor: verse,
          step: 'end_verse',
        };
      }

      const start = Math.min(state.verseAnchor, verse);
      const end = Math.max(state.verseAnchor, verse);
      return {
        ...state,
        selectedChapterEnd: state.selectedChapter,
        selectedVerseStart: start,
        selectedVerseEnd: end,
        verseAnchor: null,
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
        verseAnchor: null,
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
          verseAnchor: v,
        };
      }

      const isSameChapter = state.selectedChapter === state.selectedChapterEnd;
      const safeV = isSameChapter ? Math.max(state.selectedVerseStart, v) : v;

      return {
        ...state,
        selectedVerseEnd: safeV,
        verseAnchor: null,
      };
    }

    case 'SELECT_ENTIRE_CHAPTER': {
      if (state.selectedChapter === null) return state;
      return {
        ...state,
        selectedChapterEnd: state.selectedChapter,
        selectedVerseStart: 1,
        selectedVerseEnd: action.payload.totalVerses,
        verseAnchor: null,
        step: 'end_verse',
      };
    }

    case 'ADD_SEGMENT': {
      return clearedSelection(
        state,
        appendUniqueSegments(state.segments, [action.payload.segment])
      );
    }

    case 'ADD_SEGMENTS': {
      return clearedSelection(
        state,
        appendUniqueSegments(state.segments, action.payload.segments)
      );
    }

    case 'REMOVE_SEGMENT': {
      const index = action.payload.index;
      const segments = state.segments.filter((_, i) => i !== index);
      const removedEdit = state.editingIndex === index;
      let editingIndex = state.editingIndex;
      if (editingIndex !== null) {
        if (editingIndex === index) editingIndex = null;
        else if (editingIndex > index) editingIndex -= 1;
      }

      if (removedEdit) {
        return {
          ...clearedSelection(state, segments),
        };
      }

      return {
        ...state,
        segments,
        editingIndex,
      };
    }

    case 'MOVE_SEGMENT': {
      const { index, direction } = action.payload;
      const target = direction === 'up' ? index - 1 : index + 1;
      if (index < 0 || index >= state.segments.length) return state;
      if (target < 0 || target >= state.segments.length) return state;

      const segments = [...state.segments];
      const [item] = segments.splice(index, 1);
      segments.splice(target, 0, item);

      let editingIndex = state.editingIndex;
      if (editingIndex === index) editingIndex = target;
      else if (editingIndex === target) editingIndex = index;

      return {
        ...state,
        segments,
        editingIndex,
      };
    }

    case 'START_EDIT': {
      const segment = state.segments[action.payload.index];
      if (!segment) return state;
      const bookMeta = findCanonicalBook(segment.book);
      return {
        ...state,
        editingIndex: action.payload.index,
        selectedBook: segment.book,
        selectedChapter: segment.startChapter,
        selectedChapterEnd: segment.endChapter,
        selectedVerseStart: segment.startVerse,
        selectedVerseEnd: segment.endVerse,
        verseAnchor: null,
        expandedBook: segment.book,
        searchQuery: '',
        smartParseError: null,
        step: 'end_verse',
        testamentTab: bookMeta?.testament ?? state.testamentTab,
      };
    }

    case 'SAVE_EDIT': {
      const draft = draftFromSelection(state);
      if (state.editingIndex === null || !draft) return state;
      return clearedSelection(
        state,
        assemblePassageSegments(state.segments, draft, state.editingIndex)
      );
    }

    case 'CANCEL_EDIT': {
      return clearedSelection(state, state.segments);
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
          return { ...state, step: 'book', expandedBook: null };
        }
        return { ...state, step: 'start_chapter' };
      }

      if (state.step === 'start_chapter') {
        return { ...state, step: 'book', expandedBook: null };
      }

      return state;
    }

    case 'SET_STEP': {
      return {
        ...state,
        step: action.payload.step,
        ...(action.payload.expandedBook !== undefined
          ? { expandedBook: action.payload.expandedBook }
          : {}),
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
        let newSegments = [...state.segments];

        const hasManualDraft =
          state.searchQuery === '' &&
          state.editingIndex === null &&
          state.selectedBook !== null &&
          state.selectedChapter !== null &&
          state.selectedVerseStart !== null;

        if (hasManualDraft) {
          const manualDraft = draftFromSelection(state);
          if (manualDraft) {
            newSegments = appendUniqueSegments(newSegments, [manualDraft]);
          }
        }

        if (parsed.length > 1) {
          newSegments = appendUniqueSegments(newSegments, parsed.slice(0, -1));
        }

        const activeSegment = parsed[parsed.length - 1];
        const bookMeta = findCanonicalBook(activeSegment.book);

        return {
          ...state,
          searchQuery: raw,
          smartParseError: null,
          segments: newSegments,
          selectedBook: activeSegment.book,
          selectedChapter: activeSegment.startChapter,
          selectedChapterEnd: activeSegment.endChapter,
          selectedVerseStart: activeSegment.startVerse,
          selectedVerseEnd: activeSegment.endVerse,
          verseAnchor: null,
          expandedBook: activeSegment.book,
          testamentTab: bookMeta ? bookMeta.testament : state.testamentTab,
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
