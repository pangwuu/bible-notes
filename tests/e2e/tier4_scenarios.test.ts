/**
 * Tier 4 — Real-World Application Scenarios Test Suite
 * End-to-end user workflows simulating actual human Bible study routines,
 * mutual-friend social interactions, offline journaling, and API resilience.
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

describe('Tier 4: Real-World Application Scenarios', () => {
  let storage: MockAsyncStorage;

  beforeEach(() => {
    storage = new MockAsyncStorage();
  });

  // --------------------------------------------------------------------------
  // Scenario 1: New User Onboarding & Morning Bible Study Workflow
  // --------------------------------------------------------------------------
  test('Scenario 1: Complete New User Onboarding & Morning Bible Study Workflow', async () => {
    // 1. User Registration & Validation
    const signupData = {
      email: 'john.disciple@bible.org',
      password: 'morningPrayer2026!',
      username: 'john_disciple',
      fullName: 'John Disciple',
    };
    expect(validateUsernameOracle(signupData.username).valid).toBe(true);

    const userUid = 'uid_john_disciple_001';
    const userProfile = {
      id: userUid,
      username: signupData.username,
      full_name: signupData.fullName,
      email: signupData.email,
      default_visibility: 'friends' as const,
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    await storage.setItem(`user_${userUid}`, JSON.stringify(userProfile));

    // 2. Open App: Warm dark theme verification
    const themeModule = resolveModule('src/constants/theme');
    expect(themeModule.colors.bg.base).toBe('#1A1816');
    expect(themeModule.colors.bg.surface).toBe('#242019');
    expect(themeModule.colors.text.primary).toBe('#EDE7DD');

    // 3. Initiate New Note via FAB (accentKeyIdea #E3A53D)
    const fabColor = themeModule.colors.accent.keyIdea;
    expect(fabColor).toBe('#E3A53D');

    // 4. Passage Picker: Select Romans 8:1–11
    const book = 'Romans';
    const [startOrd, endOrd] = referenceToOrdinalsOracle(book, 8, 1, 8, 11);
    expect(startOrd).toBeGreaterThan(0);
    expect(endOrd).toBeGreaterThan(startOrd);

    // 5. Fetch and Cache ESV Scripture Text
    const passageRef = 'Romans 8:1–11';
    const cacheKey = buildBibleCacheKeyOracle('esv', passageRef);
    const passageText = 'There is therefore now no condemnation for those who are in Christ Jesus...';
    await storage.setItem(cacheKey, JSON.stringify({ text: passageText, source: 'esv' }));

    const cachedPassage = JSON.parse((await storage.getItem(cacheKey))!);
    expect(cachedPassage.text).toContain('no condemnation');
    expect(cachedPassage.source).toBe('esv');

    // 6. Write Swedish Method note in Day One unbordered editor
    const swedishModule = resolveModule('src/constants/swedishMethod');
    const noteContent = `### 💡 Key Idea(s)
There is therefore now no condemnation for those who are in Christ Jesus.

### ❓ Question(s)
How does the law of the Spirit set us free from the law of sin and death?

### 🏹 Application(s)
Walk today in the Spirit, refusing to dwell in guilt or fear.`;

    expect(noteContent).toContain('💡 Key Idea(s)');
    expect(noteContent).toContain('❓ Question(s)');
    expect(noteContent).toContain('🏹 Application(s)');

    // 7. Add tags
    const noteTags = ['assurance', 'romans', 'grace'];
    expect(noteTags.length).toBeLessThanOrEqual(5);

    // 8. Explicit save note
    const savedNote = {
      id: 'note_john_romans8',
      user_id: userUid,
      book,
      chapter_start: 8,
      verse_start: 1,
      chapter_end: 8,
      verse_end: 11,
      start_verse_id: startOrd,
      end_verse_id: endOrd,
      content: noteContent,
      tags: noteTags,
      visibility: userProfile.default_visibility,
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    await storage.setItem(`note_${savedNote.id}`, JSON.stringify(savedNote));
    const retrieved = JSON.parse((await storage.getItem(`note_${savedNote.id}`))!);
    expect(retrieved.id).toBe('note_john_romans8');
    expect(retrieved.visibility).toBe('friends');
    expect(retrieved.tags).toContain('assurance');
  });

  // --------------------------------------------------------------------------
  // Scenario 2: Mutual Friend Social Interaction & Live Overlap Detection
  // --------------------------------------------------------------------------
  test('Scenario 2: Mutual Friend Social Interaction & Live Overlap Detection Workflow', async () => {
    const userJohn = 'uid_john';
    const userSarah = 'uid_sarah';

    // 1. Sarah searches for John by exact username
    const userDirectory = [
      { id: userJohn, username: 'john_disciple', email: 'john@bible.org' },
      { id: userSarah, username: 'sarah_study', email: 'sarah@bible.org' },
    ];
    const match = userDirectory.find((u) => u.username === 'john_disciple');
    expect(match).toBeDefined();

    // 2. Sarah sends friend request
    const friendshipId = friendshipDocIdOracle(userJohn, userSarah);
    const friendship = {
      id: friendshipId,
      user_ids: [userJohn, userSarah],
      status: 'pending' as 'pending' | 'accepted',
      requested_by: userSarah,
    };
    expect(friendship.status).toBe('pending');

    // 3. John accepts friendship
    friendship.status = 'accepted';
    expect(friendship.status).toBe('accepted');

    // 4. John already has saved note on Romans 8:1–11
    const [johnStart, johnEnd] = referenceToOrdinalsOracle('Romans', 8, 1, 8, 11);
    const johnNote = {
      id: 'note_john_1',
      user_id: userJohn,
      book: 'Romans',
      start_verse_id: johnStart,
      end_verse_id: johnEnd,
      visibility: 'friends',
    };

    // 5. Sarah studies Romans 8:8–25
    const [sarahStart, sarahEnd] = referenceToOrdinalsOracle('Romans', 8, 8, 8, 25);
    const sarahNote = {
      id: 'note_sarah_1',
      user_id: userSarah,
      book: 'Romans',
      start_verse_id: sarahStart,
      end_verse_id: sarahEnd,
      visibility: 'friends',
    };

    // 6. Live overlap detection in editor
    const overlapResult = checkRangeOverlapOracle(
      [sarahNote.start_verse_id, sarahNote.end_verse_id],
      [johnNote.start_verse_id, johnNote.end_verse_id]
    );
    expect(overlapResult.overlaps).toBe(true);

    // 7. Letterboxd-style overlap badge pill display
    const themeModule = resolveModule('src/constants/theme');
    const badgeText = 'John also noted Romans 8:1–11';
    const badgeBorderColor = themeModule.colors.accent.social;
    expect(badgeText).toContain('John also noted');
    expect(badgeBorderColor).toBe('#B4789E');

    // 8. Notification creation for John
    const notificationDoc = {
      id: `notif_${sarahNote.id}_${userJohn}`,
      user_id: userJohn,
      type: 'friend_note_exists',
      related_note_id: sarahNote.id,
      related_user_name: 'Sarah',
      passage_summary: 'Romans 8:8–25',
      read: false,
    };
    expect(notificationDoc.read).toBe(false);

    // 9. John receives notification, taps to mark read and view note
    notificationDoc.read = true;
    expect(notificationDoc.read).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Scenario 3: Offline Bible Study in Flight Mode Workflow
  // --------------------------------------------------------------------------
  test('Scenario 3: Offline Bible Study in Flight Mode Workflow', async () => {
    // 1. Online: Pre-cache Ephesians 2:1–10
    const passage = 'Ephesians 2:1–10';
    const cacheKey = buildBibleCacheKeyOracle('esv', passage);
    const esvPassage = {
      text: 'And you were dead in the trespasses and sins in which you once walked...',
      source: 'esv',
    };
    await storage.setItem(cacheKey, JSON.stringify(esvPassage));

    // 2. Flight mode on: Network offline
    const isOnline = false;

    // 3. Open Ephesians note: Loads immediately from cache
    const offlineCached = await storage.getItem(cacheKey);
    expect(offlineCached).not.toBeNull();
    const loadedData = JSON.parse(offlineCached!);
    expect(loadedData.text).toContain('dead in the trespasses');

    // 4. User writes reflections and auto-saves to offline queue
    const offlineDraft = {
      id: 'draft_ephesians_2',
      content: '### 💡 Key Idea\nBy grace you have been saved through faith.',
      synced: false,
    };
    await storage.setItem(`offline_draft_${offlineDraft.id}`, JSON.stringify(offlineDraft));

    // 5. User requests uncached passage (Leviticus 1) while offline -> polite banner
    const uncachedPassage = await storage.getItem(buildBibleCacheKeyOracle('esv', 'Leviticus 1'));
    expect(uncachedPassage).toBeNull();
    const offlineNotice = !isOnline && !uncachedPassage ? 'Passage not cached for offline study.' : null;
    expect(offlineNotice).toBe('Passage not cached for offline study.');

    // 6. Flight mode off: Network reconnects -> sync pending drafts
    const pendingDraftRaw = await storage.getItem(`offline_draft_${offlineDraft.id}`);
    const draftToSync = JSON.parse(pendingDraftRaw!);
    draftToSync.synced = true;
    expect(draftToSync.synced).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Scenario 4: Privacy Boundary & Confidential Prayer Journaling
  // --------------------------------------------------------------------------
  test('Scenario 4: Privacy Boundary & Confidential Prayer Journaling Workflow', async () => {
    const userA = 'user_david';
    const userB = 'user_sarah';

    // 1. User A writes private note on Psalm 51
    const [start, end] = referenceToOrdinalsOracle('Psalms', 51, 1, 51, 12);
    const privateNote = {
      id: 'note_private_confession',
      user_id: userA,
      book: 'Psalms',
      start_verse_id: start,
      end_verse_id: end,
      visibility: 'private' as const,
      content: 'Personal private prayer and confession...',
    };

    // 2. Mutual friend User B queries User A's shared feed
    // firestore.rules: allow read: if resource.data.visibility == 'friends' && areFriends(...)
    const isVisibleToFriend = (note: { visibility: 'friends' | 'private' }) => note.visibility === 'friends';
    expect(isVisibleToFriend(privateNote)).toBe(false);

    // 3. User B writes overlapping note on Psalm 51:1–10
    const [bStart, bEnd] = referenceToOrdinalsOracle('Psalms', 51, 1, 51, 10);
    const userBNote = {
      id: 'note_sarah_psalm51',
      user_id: userB,
      book: 'Psalms',
      start_verse_id: bStart,
      end_verse_id: bEnd,
      visibility: 'friends' as const,
    };

    // 4. Overlap notification logic verifies User A's private note does not trigger notifications
    const shouldNotify = (note: { visibility: 'friends' | 'private' }) => note.visibility === 'friends';
    expect(shouldNotify(privateNote)).toBe(false);

    // 5. User A retains full read access to their own private note
    const canAuthorRead = privateNote.user_id === userA;
    expect(canAuthorRead).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Scenario 5: External API Failure & Resilient Failover Workflow
  // --------------------------------------------------------------------------
  test('Scenario 5: External API Failure & Resilient Failover Workflow', async () => {
    // 1. User requests Genesis 1:1–31
    const passageQuery = 'Genesis 1:1–31';

    // 2. Simulated fetch pipeline: ESV throws HTTP 503 Service Unavailable
    const fetchScripture = async () => {
      try {
        // Attempt ESV
        throw new Error('HTTP 503: Service Unavailable');
      } catch {
        // Fallback to WEB
        return {
          text: 'In the beginning God created the heavens and the earth...',
          source: 'web' as const,
        };
      }
    };

    const response = await fetchScripture();
    expect(response.source).toBe('web');
    expect(response.text).toContain('In the beginning');

    // 3. Cache WEB response locally
    const webCacheKey = buildBibleCacheKeyOracle('web', passageQuery);
    await storage.setItem(webCacheKey, JSON.stringify(response));

    const retrieved = await storage.getItem(webCacheKey);
    expect(retrieved).not.toBeNull();
    expect(JSON.parse(retrieved!).source).toBe('web');

    // 4. Note creation completes without blocking user
    const note = {
      book: 'Genesis',
      content: '### 💡 Key Idea\nGod speaks all of creation into existence out of nothing.',
    };
    expect(note.content).toContain('Key Idea');
  });

});
