/**
 * PassagePicker Facade
 * 
 * Re-exports the modular PassagePicker component, formal state reducer,
 * canonical math utilities, and types for backward compatibility.
 */

export { default } from './passagePicker/PassagePicker';
export * from './passagePicker/passagePickerTypes';
export * from './passagePicker/passagePickerUtils';
export * from './passagePicker/passagePickerReducer';

export {
  CANONICAL_BOOKS,
  findCanonicalBook,
  TOTAL_CANONICAL_VERSES,
  TOTAL_CANONICAL_CHAPTERS,
  BOOK_STARTING_ORDINALS,
  CanonicalBook,
} from '../constants/bibleData';
