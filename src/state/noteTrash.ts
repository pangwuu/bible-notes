/**
 * A tiny shared channel between the screen that deletes a note, the app-wide
 * Undo bar, and the lists that need to refresh when a note comes back.
 *
 * The note screen closes as soon as you delete, so the Undo bar can't live on
 * that screen; and the notes list is already focused when Undo is tapped, so
 * its useFocusEffect won't refetch on its own.
 */

export interface DeletedNoteNotice {
  id: string;
  label: string;
}

type Listener<T> = (value: T) => void;

const deletedListeners = new Set<Listener<DeletedNoteNotice>>();
const changedListeners = new Set<Listener<void>>();

export function announceNoteDeleted(notice: DeletedNoteNotice) {
  deletedListeners.forEach((l) => l(notice));
}

export function onNoteDeleted(listener: Listener<DeletedNoteNotice>): () => void {
  deletedListeners.add(listener);
  return () => {
    deletedListeners.delete(listener);
  };
}

export function announceNotesChanged() {
  changedListeners.forEach((l) => l());
}

export function onNotesChanged(listener: Listener<void>): () => void {
  changedListeners.add(listener);
  return () => {
    changedListeners.delete(listener);
  };
}
