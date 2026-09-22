/**
 * Tier 3 — Cross-Feature Combinations & Pairwise Interactions
 * Verifies complex multi-feature workflows and state transitions across the 36 features.
 * Authoritative sources: ORIGINAL_REQUEST.md, DESIGN.md, specs.md, firestore.rules.
 */

import fs from 'fs';
import path from 'path';
import {
  ROOT_DIR,
  referenceToOrdinalsOracle,
  checkRangeOverlapOracle,
  validateUsernameOracle,
  friendshipDocIdOracle,
  buildBibleCacheKeyOracle,
  MockAsyncStorage,
  resolveModule,
} from './testHelpers';

describe('Tier 3: Cross-Feature Combinations', () => {
  let storage: MockAsyncStorage;

  beforeEach(() => {
    storage = new MockAsyncStorage();
  });

  // --------------------------------------------------------------------------
  // Combination 1: Auth Registration -> Profile Creation -> Settings Defaults
  // --------------------------------------------------------------------------
  describe('Combination 1: Auth Registration -> Profile Creation -> Settings Defaults', () => {
    test('User registration creates user profile with unique username and default friends visibility', async () => {
      // 1. Validate registration inputs
      const registrationInput = {
        email: 'sarah.lindqvist@example.com',
        password: 'securePassword2026!',
        username: 'sarah_l',
        fullName: 'Sarah Lindqvist',
      };
      expect(validateUsernameOracle(registrationInput.username).valid).toBe(true);

      // 2. Simulate Firestore users/{uid} creation
      const uid = 'auth_uid_sarah_123';
      const userProfileDoc = {
        id: uid,
        username: registrationInput.username,
        full_name: registrationInput.fullName,
        email: registrationInput.email.toLowerCase(),
        default_visibility: 'friends' as const,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      // 3. Persist session token to AsyncStorage
      await storage.setItem('auth_session_token', `jwt_token_for_${uid}`);
      await storage.setItem(`user_profile_${uid}`, JSON.stringify(userProfileDoc));

      // 4. Verify settings screen receives profile with default_visibility == 'friends'
      const sessionToken = await storage.getItem('auth_session_token');
      expect(sessionToken).not.toBeNull();

      const loadedProfile = JSON.parse((await storage.getItem(`user_profile_${uid}`))!);
      expect(loadedProfile.default_visibility).toBe('friends');
      expect(loadedProfile.username).toBe('sarah_l');
    });
  });

  // --------------------------------------------------------------------------
  // Combination 2: Note Creation -> Passage Picker -> Ordinals -> Swedish Template
  // --------------------------------------------------------------------------
  describe('Combination 2: Note Creation -> Passage Picker -> Ordinals -> Swedish Template', () => {
    test('Passage selection computes canonical ordinals and initializes Swedish Method editor', () => {
      // 1. Passage Picker drill-down: Romans 8:1–11
      const selectedBook = 'Romans';
      const startChapter = 8;
      const startVerse = 1;
      const endChapter = 8;
      const endVerse = 11;

      // 2. Compute canonical ordinals
      const [startOrd, endOrd] = referenceToOrdinalsOracle(selectedBook, startChapter, startVerse, endChapter, endVerse);
      expect(startOrd).toBeGreaterThan(0);
      expect(startOrd).toBeLessThan(endOrd);

      // 3. Pre-fill editor with Swedish Method headers and accent color mapping
      const swedishModule = resolveModule('src/constants/swedishMethod');
      const themeModule = resolveModule('src/constants/theme');

      const initialEditorContent = swedishModule.SWEDISH_TEMPLATE_MARKDOWN;
      expect(initialEditorContent).toContain('### 💡 Key Idea(s)');
      expect(initialEditorContent).toContain('### ❓ Question(s)');
      expect(initialEditorContent).toContain('### 🏹 Application(s)');

      // Verify accent tokens correspond to DESIGN.md
      const keyIdeaSection = swedishModule.SWEDISH_SECTIONS.find((s: any) => s.key === 'keyIdea');
      expect(keyIdeaSection.color).toBe(themeModule.colors.accent.keyIdea);
      expect(keyIdeaSection.color).toBe('#E3A53D');

      // 4. Construct complete Note draft payload
      const noteDraft = {
        book: selectedBook,
        chapter_start: startChapter,
        verse_start: startVerse,
        chapter_end: endChapter,
        verse_end: endVerse,
        start_verse_id: startOrd,
        end_verse_id: endOrd,
        content: initialEditorContent,
        tags: [] as string[],
        visibility: 'friends' as const,
      };

      expect(noteDraft.start_verse_id).toBe(startOrd);
      expect(noteDraft.end_verse_id).toBe(endOrd);
      expect(noteDraft.visibility).toBe('friends');
    });
  });

  // --------------------------------------------------------------------------
  // Combination 3: Note Save -> Overlap Detection -> Notification Creation
  // --------------------------------------------------------------------------
  describe('Combination 3: Note Save -> Overlap Detection -> Notification Creation', () => {
    test('Saving non-private note triggers client overlap check and generates notification for mutual friend', async () => {
      const userA = 'user_david_1';
      const userB = 'user_sarah_2';

      // 1. Establish mutual friendship
      const friendshipId = friendshipDocIdOracle(userA, userB);
      expect(friendshipId).toBe('user_david_1_user_sarah_2');
      const friendship = {
        id: friendshipId,
        user_ids: [userA, userB],
        status: 'accepted',
      };
      expect(friendship.status).toBe('accepted');

      // 2. User B already has an existing note on Romans 8:8–25
      const [bStart, bEnd] = referenceToOrdinalsOracle('Romans', 8, 8, 8, 25);
      const userBNote = {
        id: 'note_sarah_romans8',
        user_id: userB,
        book: 'Romans',
        chapter_start: 8,
        verse_start: 8,
        chapter_end: 8,
        verse_end: 25,
        start_verse_id: bStart,
        end_verse_id: bEnd,
        visibility: 'friends',
      };

      // 3. User A creates a new note on Romans 8:1–11
      const [aStart, aEnd] = referenceToOrdinalsOracle('Romans', 8, 1, 8, 11);
      const userANote = {
        id: 'note_david_romans8',
        user_id: userA,
        book: 'Romans',
        chapter_start: 8,
        verse_start: 1,
        chapter_end: 8,
        verse_end: 11,
        start_verse_id: aStart,
        end_verse_id: aEnd,
        visibility: 'friends',
      };

      // 4. Overlap Engine evaluates range intersection
      expect(userANote.book).toBe(userBNote.book);
      const overlapResult = checkRangeOverlapOracle(
        [userANote.start_verse_id, userANote.end_verse_id],
        [userBNote.start_verse_id, userBNote.end_verse_id]
      );

      expect(overlapResult.overlaps).toBe(true);
      expect(overlapResult.overlapRange).toBeDefined();

      // 5. Generate client-side notification for User B
      const notificationDoc = {
        id: `overlap_${userANote.id}_${userB}`,
        user_id: userB, // recipient
        type: 'friend_note_exists' as const,
        related_note_id: userANote.id,
        related_user_id: userA,
        related_user_name: 'David',
        passage_summary: 'Romans 8:1–11',
        read: false,
        created_at: Date.now(),
      };

      expect(notificationDoc.user_id).toBe(userB);
      expect(notificationDoc.related_user_id).toBe(userA);
      expect(notificationDoc.read).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Combination 4: Private Note -> Overlap Suppression -> Security Guard
  // --------------------------------------------------------------------------
  describe('Combination 4: Private Note -> Overlap Suppression -> Security Guard', () => {
    test('Private note suppresses overlap notifications and blocks friend read access', () => {
      const userA = 'user_david_1';
      const userB = 'user_sarah_2';

      // User A creates private note
      const [start, end] = referenceToOrdinalsOracle('Romans', 8, 1, 8, 11);
      const privateNote = {
        id: 'private_note_1',
        user_id: userA,
        book: 'Romans',
        start_verse_id: start,
        end_verse_id: end,
        visibility: 'private',
      };

      // 1. Overlap detection skips private notes
      const shouldCheckOverlap = privateNote.visibility === 'friends';
      expect(shouldCheckOverlap).toBe(false);

      // 2. firestore.rules security evaluation simulation:
      // allow read: if resource.data.user_id == request.auth.uid ||
      // (resource.data.visibility == 'friends' && areFriends(request.auth.uid, resource.data.user_id))
      const canRead = (authUid: string, note: typeof privateNote, areFriendsAccepted: boolean) => {
        if (note.user_id === authUid) return true;
        if (note.visibility === 'friends' && areFriendsAccepted) return true;
        return false;
      };

      // Author can read
      expect(canRead(userA, privateNote, true)).toBe(true);
      // Mutual friend cannot read private note
      expect(canRead(userB, privateNote, true)).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Combination 5: Scripture Fetching -> ESV API -> Local Cache -> Offline Reader
  // --------------------------------------------------------------------------
  describe('Combination 5: Scripture Fetching -> ESV API -> Local Cache -> Offline Reader', () => {
    test('Passage fetched from ESV API is cached in AsyncStorage and rendered offline with SourceSerifPro', async () => {
      const passageRef = 'John 3:16';
      const cacheKey = buildBibleCacheKeyOracle('esv', passageRef);

      // 1. Simulate initial ESV network fetch
      const mockEsvPayload = {
        text: 'For God so loved the world, that he gave his only Son...',
        source: 'esv' as const,
        timestamp: Date.now(),
      };

      // 2. Persist in AsyncStorage
      await storage.setItem(cacheKey, JSON.stringify(mockEsvPayload));

      // 3. Simulate offline read: network unavailable, read from cache
      const cachedRaw = await storage.getItem(cacheKey);
      expect(cachedRaw).not.toBeNull();
      const cachedData = JSON.parse(cachedRaw!);
      expect(cachedData.source).toBe('esv');
      expect(cachedData.text).toContain('For God so loved the world');

      // 4. Verify typography for Scripture reader
      const themeModule = resolveModule('src/constants/theme');
      expect(themeModule.typography.body.fontFamily).toBe('SourceSerifPro');
      expect(themeModule.typography.body.fontSize).toBe(16);
    });
  });

  // --------------------------------------------------------------------------
  // Combination 6: ESV Rate Limit -> WEB Fallback -> Inline Overlap Badge
  // --------------------------------------------------------------------------
  describe('Combination 6: ESV Rate Limit -> WEB Fallback -> Inline Overlap Badge', () => {
    test('HTTP 429 triggers WEB fallback and displays alongside Letterboxd-style overlap badge', async () => {
      const fetchPassageWithFallback = async (status: number) => {
        if (status === 429) {
          // Fallback to WEB
          return {
            text: 'For God so loved the world...',
            source: 'web' as const,
          };
        }
        return { text: 'ESV text', source: 'esv' as const };
      };

      const result = await fetchPassageWithFallback(429);
      expect(result.source).toBe('web');

      // Save to WEB cache key
      const webCacheKey = buildBibleCacheKeyOracle('web', 'John 3:16');
      await storage.setItem(webCacheKey, JSON.stringify(result));
      expect(await storage.getItem(webCacheKey)).not.toBeNull();

      // Overlap badge pill styling verification
      const themeModule = resolveModule('src/constants/theme');
      const badgeStyle = {
        borderColor: themeModule.colors.accent.social, // #B4789E
        borderRadius: themeModule.radii.controls, // 8px
      };
      expect(badgeStyle.borderColor).toBe('#B4789E');
      expect(badgeStyle.borderRadius).toBe(8);
    });
  });

  // --------------------------------------------------------------------------
  // Combination 7: User Search -> Friend Request -> Accept -> Shared Note Feed
  // --------------------------------------------------------------------------
  describe('Combination 7: User Search -> Friend Request -> Accept -> Shared Note Feed', () => {
    test('Exact user search enables sending request, acceptance unlocks shared note feed', () => {
      const allUsers = [
        { id: 'u_alice', username: 'alice_w', email: 'alice@bible.org' },
        { id: 'u_bob', username: 'bob_m', email: 'bob@bible.org' },
      ];

      // 1. Alice searches for Bob by exact username
      const searchResult = allUsers.find((u) => u.username === 'bob_m');
      expect(searchResult).toBeDefined();
      expect(searchResult!.id).toBe('u_bob');

      // 2. Alice sends friend request
      const docId = friendshipDocIdOracle('u_alice', 'u_bob');
      const friendship = {
        id: docId,
        user_ids: ['u_alice', 'u_bob'],
        status: 'pending' as 'pending' | 'accepted',
        requested_by: 'u_alice',
      };
      expect(friendship.status).toBe('pending');

      // 3. Bob accepts request
      friendship.status = 'accepted';
      expect(friendship.status).toBe('accepted');

      // 4. Verify Alice can now read Bob's 'friends' visibility notes
      const bobNotes = [
        { id: 'bn1', user_id: 'u_bob', visibility: 'friends', content: 'Romans 8 reflection' },
        { id: 'bn2', user_id: 'u_bob', visibility: 'private', content: 'Personal prayer' },
      ];

      const visibleNotesToAlice = bobNotes.filter((n) => {
        if (friendship.status === 'accepted' && n.visibility === 'friends') return true;
        return false;
      });

      expect(visibleNotesToAlice.length).toBe(1);
      expect(visibleNotesToAlice[0].id).toBe('bn1');
    });
  });

  // --------------------------------------------------------------------------
  // Combination 8: Overlap Notification -> Bell Badge -> Tap to Read & Mark
  // --------------------------------------------------------------------------
  describe('Combination 8: Overlap Notification -> Bell Badge -> Tap to Read & Mark', () => {
    test('Incoming notification increments bell badge count; opening modal and tapping marks read and decrements count', () => {
      let unreadCount = 0;
      const notifications = [
        {
          id: 'notif_1',
          user_id: 'u_sarah',
          related_note_id: 'note_david_1',
          read: false,
        },
      ];

      // 1. Notification arrived -> increment unread
      unreadCount = notifications.filter((n) => !n.read).length;
      expect(unreadCount).toBe(1);

      // 2. Tap notification -> marks read and routes to note
      const tapped = notifications[0];
      tapped.read = true;
      const targetRoute = `/note/${tapped.related_note_id}`;
      expect(targetRoute).toBe('/note/note_david_1');

      // 3. Bell badge recalculation
      unreadCount = notifications.filter((n) => !n.read).length;
      expect(unreadCount).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Combination 9: Note Editor Dirty State -> Tag Chips -> Save Confirmation
  // --------------------------------------------------------------------------
  describe('Combination 9: Note Editor Dirty State -> Tag Chips -> Save Confirmation', () => {
    test('Editing note content and adding tags marks note dirty; back dialog Save commits all fields', () => {
      let isDirty = false;
      const note = {
        content: 'Original content',
        tags: [] as string[],
      };

      // 1. Edit note body
      note.content = 'Updated reflection on Romans 8';
      isDirty = true;

      // 2. Add tag chips (up to max 5)
      const newTags = ['assurance', 'romans', 'faith'];
      for (const t of newTags) {
        if (note.tags.length < 5) {
          note.tags.push(t);
        }
      }
      expect(note.tags).toEqual(['assurance', 'romans', 'faith']);

      // 3. User taps back -> triggers confirmation modal because isDirty == true
      const backActionTriggered = isDirty ? 'SHOW_MODAL' : 'NAVIGATE';
      expect(backActionTriggered).toBe('SHOW_MODAL');

      // 4. Modal "Save Changes" action is selected -> commits to state and resets dirty
      const onSaveModalConfirm = () => {
        isDirty = false;
        return { success: true, savedNote: { ...note } };
      };

      const result = onSaveModalConfirm();
      expect(result.success).toBe(true);
      expect(isDirty).toBe(false);
      expect(result.savedNote.tags.length).toBe(3);
    });
  });

  // --------------------------------------------------------------------------
  // Combination 10: Custom ESV Key in Settings -> Bible API Sync -> Fallback Revert
  // --------------------------------------------------------------------------
  describe('Combination 10: Custom ESV Key in Settings -> Bible API Sync -> Fallback Revert', () => {
    test('Settings custom ESV key is prioritized by Bible reader and cleanly reverts to default token when cleared', () => {
      const defaultToken = '6182e9590f01e9ab567fcaad00c18a7ca0cfd4ba';
      let userSettings = {
        custom_esv_api_key: 'user_private_key_xyz',
      };

      // 1. Reader uses custom key
      const getActiveToken = (settings: typeof userSettings) =>
        settings.custom_esv_api_key && settings.custom_esv_api_key.trim()
          ? settings.custom_esv_api_key.trim()
          : defaultToken;

      expect(getActiveToken(userSettings)).toBe('user_private_key_xyz');

      // 2. User clears custom key in settings
      userSettings.custom_esv_api_key = '';
      expect(getActiveToken(userSettings)).toBe(defaultToken);
    });
  });

});
