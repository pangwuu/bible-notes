/**
 * Cloud Functions for Firebase
 * Automatic notification dispatch upon note creation/update when verse overlap is detected.
 */

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Closed interval overlap calculation: max(s1, s2) <= min(e1, e2)
 */
function checkRangeOverlap(rangeA, rangeB) {
  const [s1, e1] = rangeA;
  const [s2, e2] = rangeB;
  return Math.max(s1, s2) <= Math.min(e1, e2);
}

/**
 * Triggered whenever a note document is created in `notes/{noteId}`.
 * If note is visible to friends, checks for overlapping notes from mutual friends
 * and creates notification documents for affected friends.
 */
exports.onNoteCreated = onDocumentCreated("notes/{noteId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    logger.info("No data associated with the event");
    return;
  }

  const noteData = snapshot.data();
  const noteId = event.params.noteId;

  // Only notify if note visibility is set to 'friends'
  if (noteData.visibility !== "friends") {
    return;
  }

  const authorUid = noteData.user_id;
  const book = noteData.book;
  const startOrdinal = noteData.start_verse_id || noteData.passage?.startOrdinal;
  const endOrdinal = noteData.end_verse_id || noteData.passage?.endOrdinal;

  if (!authorUid || !book || !startOrdinal || !endOrdinal) {
    logger.info("Missing essential note data for overlap check", { noteId });
    return;
  }

  try {
    // 1. Fetch author's friends
    const friendshipsSnap = await db
      .collection("friendships")
      .where("user_ids", "array-contains", authorUid)
      .where("status", "==", "accepted")
      .get();

    if (friendshipsSnap.empty) {
      return;
    }

    const friendUids = [];
    friendshipsSnap.forEach((doc) => {
      const data = doc.data();
      const otherUid = data.user_ids.find((id) => id !== authorUid);
      if (otherUid) {
        friendUids.push(otherUid);
      }
    });

    if (friendUids.length === 0) {
      return;
    }

    // 2. Fetch author profile for display name
    const authorDoc = await db.collection("users").doc(authorUid).get();
    const authorName =
      authorDoc.exists && authorDoc.data().display_name
        ? authorDoc.data().display_name
        : noteData.author_display_name || "A friend";

    const passageSummary = `${book} ${noteData.chapter_start || noteData.passage?.startChapter}:${
      noteData.verse_start || noteData.passage?.startVerse
    }`;

    // 3. For each friend, query notes for the same book and test ordinal overlap
    const batch = db.batch();
    let notificationCount = 0;

    for (const friendUid of friendUids) {
      const friendNotesSnap = await db
        .collection("notes")
        .where("user_id", "==", friendUid)
        .where("book", "==", book)
        .where("visibility", "==", "friends")
        .get();

      let hasOverlap = false;
      friendNotesSnap.forEach((fnDoc) => {
        const fnData = fnDoc.data();
        const fStart = fnData.start_verse_id || fnData.passage?.startOrdinal;
        const fEnd = fnData.end_verse_id || fnData.passage?.endOrdinal;

        if (fStart && fEnd && checkRangeOverlap([startOrdinal, endOrdinal], [fStart, fEnd])) {
          hasOverlap = true;
        }
      });

      if (hasOverlap) {
        const notifRef = db.collection("notifications").doc();
        batch.set(notifRef, {
          id: notifRef.id,
          user_id: friendUid,
          type: "friend_note_exists",
          related_note_id: noteId,
          related_user_id: authorUid,
          related_user_name: authorName,
          passage_summary: passageSummary,
          read: false,
          created_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        notificationCount++;
      }
    }

    if (notificationCount > 0) {
      await batch.commit();
      logger.info(`Dispatched ${notificationCount} overlap notifications for note ${noteId}`);
    }
  } catch (error) {
    logger.error("Error processing onNoteCreated overlap notifications:", error);
  }
});
