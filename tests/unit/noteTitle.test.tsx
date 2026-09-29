/**
 * Unit Tests for Optional Note Titles
 * Verifies:
 * 1. noteDocumentToNote mapping with title and title whitespace trimming
 * 2. notesService createNote and updateNote storing title
 * 3. NoteCard rendering title as heading and passage as subtitle when title is present
 * 4. NoteCard falling back to passageRef when title is absent
 * 5. FriendNoteCard rendering title as heading and passage as subtitle when title is present
 */

import React from 'react';
import renderer from 'react-test-renderer';
import { Text } from 'react-native';
import NoteCard from '../../src/components/NoteCard';
import FriendNoteCard from '../../src/components/FriendNoteCard';
import RandomReflectionCard from '../../src/components/RandomReflectionCard';
import { noteDocumentToNote, Note, NoteDocument } from '../../src/types/note';
import { createNote, updateNote } from '../../src/services/notesService';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
  MaterialCommunityIcons: () => null,
}));

// Mock Firebase dependencies
const mockSetDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockDoc = jest.fn((...args: any[]) => ({ id: args[2] || 'generated_doc_id' }));
const mockCollection = jest.fn((...args: any[]) => ({ path: args[1] }));
const mockServerTimestamp = jest.fn(() => 123456789);
const mockDeleteField = jest.fn(() => '__DELETE_FIELD__');

jest.mock('firebase/firestore', () => ({
  doc: (...args: any[]) => mockDoc(...args),
  collection: (...args: any[]) => mockCollection(...args),
  setDoc: (...args: any[]) => mockSetDoc(...args),
  updateDoc: (...args: any[]) => mockUpdateDoc(...args),
  deleteField: () => mockDeleteField(),
  serverTimestamp: () => mockServerTimestamp(),
  getDoc: jest.fn(async () => ({
    exists: () => true,
    data: () => ({
      user_id: 'u1',
      passage: mockPassage,
      content: '',
      tags: [],
      visibility: 'private',
      created_at: 1000,
      updated_at: 1000,
    }),
  })),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  limit: jest.fn(),
  startAfter: jest.fn(),
  deleteDoc: jest.fn(),
}));

jest.mock('../../src/services/firebase', () => ({
  db: {},
  auth: {
    currentUser: { uid: 'u1' },
  },
}));

const mockPassage = {
  display: 'Romans 8:28',
  books: ['Romans'],
  segments: [{ book: 'Romans', startChapter: 8, startVerse: 28, endChapter: 8, endVerse: 28 }],
};

const mockDocPassage = {
  display: 'Romans 8:28',
  books: ['Romans'],
  segments: [{ book: 'Romans', start_chapter: 8, start_verse: 28, end_chapter: 8, end_verse: 28 }],
};

describe('Optional Note Titles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('noteDocumentToNote mapper', () => {
    it('maps title when present in document', () => {
      const doc: NoteDocument = {
        id: 'note_1',
        user_id: 'u1',
        title: 'All Things Work Together',
        passage: mockDocPassage,
        content: 'Reflection text',
        light_content: '',
        question_content: '',
        arrow_content: '',
        tags: ['faith'],
        visibility: 'private',
        created_at: 1000,
        updated_at: 1000,
      };

      const note = noteDocumentToNote(doc, 'note_1');
      expect(note.title).toBe('All Things Work Together');
    });

    it('trims whitespace and treats whitespace-only title as undefined', () => {
      const doc: NoteDocument = {
        id: 'note_2',
        user_id: 'u1',
        title: '   ',
        passage: mockDocPassage,
        content: 'Reflection text',
        light_content: '',
        question_content: '',
        arrow_content: '',
        tags: ['faith'],
        visibility: 'private',
        created_at: 1000,
        updated_at: 1000,
      };

      const note = noteDocumentToNote(doc, 'note_2');
      expect(note.title).toBeUndefined();
    });

    it('leaves title as undefined when document has no title property', () => {
      const doc: NoteDocument = {
        id: 'note_3',
        user_id: 'u1',
        passage: mockDocPassage,
        content: 'Reflection text',
        light_content: '',
        question_content: '',
        arrow_content: '',
        tags: ['faith'],
        visibility: 'private',
        created_at: 1000,
        updated_at: 1000,
      };

      const note = noteDocumentToNote(doc, 'note_3');
      expect(note.title).toBeUndefined();
    });
  });

  describe('notesService title persistence', () => {
    it('createNote includes title in document data when provided', async () => {
      await createNote({
        userId: 'u1',
        authorUsername: 'johnny',
        authorDisplayName: 'Johnny',
        title: 'Morning Devotional',
        passage: mockPassage,
        tags: ['devotional'],
        visibility: 'friends',
      });

      expect(mockSetDoc).toHaveBeenCalledTimes(1);
      const savedData = mockSetDoc.mock.calls[0][1];
      expect(savedData.title).toBe('Morning Devotional');
    });

    it('createNote omits title property from document payload when title is empty or whitespace', async () => {
      await createNote({
        userId: 'u1',
        authorUsername: 'johnny',
        authorDisplayName: 'Johnny',
        title: '   ',
        passage: mockPassage,
        tags: ['devotional'],
        visibility: 'friends',
      });

      expect(mockSetDoc).toHaveBeenCalledTimes(1);
      const savedData = mockSetDoc.mock.calls[0][1];
      expect(Object.prototype.hasOwnProperty.call(savedData, 'title')).toBe(false);
    });

    it('updateNote includes title in updated document data', async () => {
      const updated = await updateNote('note_1', {
        title: 'Updated Title',
      });

      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
      const updateData = mockUpdateDoc.mock.calls[0][1];
      expect(updateData.title).toBe('Updated Title');
      expect(updated.title).toBe('Updated Title');
    });

    it('updateNote uses deleteField and clears title when title is empty or whitespace', async () => {
      const updated = await updateNote('note_1', {
        title: '   ',
      });

      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
      const updateData = mockUpdateDoc.mock.calls[0][1];
      expect(updateData.title).toBe('__DELETE_FIELD__');
      expect(updated.title).toBeUndefined();
    });
  });

  describe('NoteCard UI rendering', () => {
    const baseNote: Note = {
      id: 'n1',
      userId: 'u1',
      user_id: 'u1',
      passage: mockPassage,
      sections: [],
      lightContent: '',
      questionContent: '',
      arrowContent: '',
      content: 'A wonderful promise',
      tags: ['promise'],
      visibility: 'friends',
      createdAt: 1000,
      updatedAt: 1000,
      created_at: 1000,
      updated_at: 1000,
    };

    it('renders note title as heading and passage as subtitle when title is provided', () => {
      const titledNote: Note = {
        ...baseNote,
        title: 'God Works for Good',
      };

      let component: renderer.ReactTestRenderer | undefined;
      renderer.act(() => {
        component = renderer.create(<NoteCard note={titledNote} onPress={jest.fn()} />);
      });

      const root = component!.root;
      const texts = root.findAllByType(Text).map((t) => t.props.children);

      expect(texts).toContain('God Works for Good');
      expect(texts).toContain('Romans 8:28');
    });

    it('renders passage reference as main title when note is untitled', () => {
      let component: renderer.ReactTestRenderer | undefined;
      renderer.act(() => {
        component = renderer.create(<NoteCard note={baseNote} onPress={jest.fn()} />);
      });

      const root = component!.root;
      const texts = root.findAllByType(Text).map((t) => t.props.children);

      expect(texts).toContain('Romans 8:28');
    });
  });

  describe('FriendNoteCard UI rendering', () => {
    const baseFriendNote: Note = {
      id: 'fn1',
      userId: 'friend_1',
      user_id: 'friend_1',
      authorUsername: 'sarah',
      authorDisplayName: 'Sarah',
      passage: mockPassage,
      sections: [],
      lightContent: '',
      questionContent: '',
      arrowContent: '',
      content: 'Shared encouragement',
      tags: ['faith'],
      visibility: 'friends',
      createdAt: 1000,
      updatedAt: 1000,
      created_at: 1000,
      updated_at: 1000,
    };

    const authorProfile: any = {
      id: 'friend_1',
      uid: 'friend_1',
      username: 'sarah',
      display_name: 'Sarah',
      email: 'sarah@example.com',
      full_name: 'Sarah',
      default_visibility: 'friends',
      friends: [],
      pending_requests: [],
      created_at: 1000,
      updated_at: 1000,
    };

    it('renders title as heading and passage as subtitle when friend note has title', () => {
      const titledFriendNote: Note = {
        ...baseFriendNote,
        title: 'Encouragement for Today',
      };

      let component: renderer.ReactTestRenderer | undefined;
      renderer.act(() => {
        component = renderer.create(
          <FriendNoteCard
            item={{
              note: titledFriendNote,
              author: authorProfile,
              isIntersecting: false,
            }}
            onPress={jest.fn()}
          />
        );
      });

      const root = component!.root;
      const texts = root.findAllByType(Text).map((t) => t.props.children);

      expect(texts).toContain('Encouragement for Today');
      expect(texts).toContain('Romans 8:28');
    });

    it('renders passage reference when friend note is untitled', () => {
      let component: renderer.ReactTestRenderer | undefined;
      renderer.act(() => {
        component = renderer.create(
          <FriendNoteCard
            item={{
              note: baseFriendNote,
              author: authorProfile,
              isIntersecting: false,
            }}
            onPress={jest.fn()}
          />
        );
      });

      const root = component!.root;
      const texts = root.findAllByType(Text).map((t) => t.props.children);

      expect(texts).toContain('Romans 8:28');
    });
  });

  describe('RandomReflectionCard UI rendering', () => {
    const baseReflectionNote: Note = {
      id: 'rn1',
      userId: 'u1',
      user_id: 'u1',
      passage: mockPassage,
      sections: [],
      lightContent: 'Reflect deeply',
      questionContent: '',
      arrowContent: '',
      content: 'Reflect deeply',
      tags: ['reflection'],
      visibility: 'private',
      createdAt: 1000,
      updatedAt: 1000,
      created_at: 1000,
      updated_at: 1000,
    };

    it('renders title as heading and passage as subtitle when note has title', () => {
      const titledNote: Note = {
        ...baseReflectionNote,
        title: 'Rediscovered Truth',
      };

      let component: renderer.ReactTestRenderer | undefined;
      renderer.act(() => {
        component = renderer.create(
          <RandomReflectionCard
            note={titledNote}
            onPress={jest.fn()}
            onShuffle={jest.fn()}
          />
        );
      });

      const root = component!.root;
      const texts = root.findAllByType(Text).map((t) => t.props.children);

      expect(texts).toContain('Rediscovered Truth');
      expect(texts).toContain('Romans 8:28');
    });

    it('renders passage reference when note is untitled', () => {
      let component: renderer.ReactTestRenderer | undefined;
      renderer.act(() => {
        component = renderer.create(
          <RandomReflectionCard
            note={baseReflectionNote}
            onPress={jest.fn()}
            onShuffle={jest.fn()}
          />
        );
      });

      const root = component!.root;
      const texts = root.findAllByType(Text).map((t) => t.props.children);

      expect(texts).toContain('Romans 8:28');
    });
  });
});
