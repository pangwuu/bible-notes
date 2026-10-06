/**
 * Integration Test for Cloud Firestore Security Rules
 * Runs against the local Firestore Emulator using @firebase/rules-unit-testing
 */

import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import fs from 'fs';
import path from 'path';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

const PROJECT_ID = 'bible-notes-rules-test';
const RULES_PATH = path.resolve(__dirname, '../../firestore.rules');

describe('Firestore Security Rules Integration (Emulator)', () => {
  let testEnv: RulesTestEnvironment | null = null;
  const isEmulatorAvailable = !!process.env.FIRESTORE_EMULATOR_HOST;

  beforeAll(async () => {
    if (!isEmulatorAvailable) {
      return;
    }
    const rules = fs.readFileSync(RULES_PATH, 'utf8');
    const hostPort = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
    const [host, portStr] = hostPort.split(':');
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules,
        host: host || 'localhost',
        port: parseInt(portStr || '8080', 10),
      },
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    if (testEnv) {
      await testEnv.clearFirestore();
    }
  });

  const conditionalTest = isEmulatorAvailable ? test : test.skip;

  conditionalTest('unauthenticated read is rejected for users collection', async () => {
    if (!testEnv) return;
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    const userRef = doc(unauthDb, 'users/user_123');
    await assertFails(getDoc(userRef));
  });

  conditionalTest('authenticated user can read any profile and update their own', async () => {
    if (!testEnv) return;
    const user1Db = testEnv.authenticatedContext('user_1').firestore();
    const user1Ref = doc(user1Db, 'users/user_1');
    const user2Ref = doc(user1Db, 'users/user_2');

    // Create own profile
    await assertSucceeds(setDoc(user1Ref, { username: 'userone' }));
    // Read another profile
    await assertSucceeds(getDoc(user2Ref));
    // Fail updating another profile
    await assertFails(updateDoc(user2Ref, { username: 'hacked' }));
    // Fail deleting own profile (prohibited by rule)
    await assertFails(deleteDoc(user1Ref));
  });

  conditionalTest('friend note visibility rules: non-friend cannot read private or friends note', async () => {
    if (!testEnv) return;
    // Setup note as admin
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'notes/private_note_1'), {
        user_id: 'alice',
        visibility: 'private',
        book: 'Romans',
      });
      await setDoc(doc(adminDb, 'notes/friend_note_1'), {
        user_id: 'alice',
        visibility: 'friends',
        book: 'Romans',
      });
    });

    const bobDb = testEnv.authenticatedContext('bob').firestore();
    // Cannot read Alice's private note
    await assertFails(getDoc(doc(bobDb, 'notes/private_note_1')));
    // Cannot read Alice's friends note because friendship does not exist
    await assertFails(getDoc(doc(bobDb, 'notes/friend_note_1')));
  });

  test('rule file exists and contains canonical helper definitions', () => {
    const content = fs.readFileSync(RULES_PATH, 'utf8');
    expect(content).toContain('function isAuthenticated()');
    expect(content).toContain('function isOwner(userId)');
    expect(content).toContain('function areFriends(uidA, uidB)');
    expect(content).toContain('match /notes/{noteId}');
    expect(content).toContain('match /friendships/{friendshipId}');
  });
});
