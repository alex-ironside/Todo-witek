'use strict';
// Cron script: query Firestore for due reminders, send FCM, mark fired, clean stale tokens.
// Invoked by GitHub Actions every 15 minutes via schedule: */15 * * * *
// CommonJS (.cjs) to avoid ESM conflict with root "type":"module".

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : null;

if (serviceAccount) {
  initializeApp({ credential: cert(serviceAccount) });
} else if (process.env.FIRESTORE_EMULATOR_HOST) {
  // Running against emulator (tests): initialize without credentials
  initializeApp({ projectId: 'todo-witek' });
} else {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is required in production');
}

const db = getFirestore();
const messaging = getMessaging();

// D-06: 30-minute look-back window. Reminders older than this are silently skipped
// to prevent a flood of stale notifications if the cron is ever down for a period.
const WINDOW_MS = 30 * 60 * 1000;

async function sendDueReminders(messagingOverride) {
  const msg = messagingOverride || messaging;
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  const snap = await db.collection('todos').where('done', '==', false).get();
  console.log(`[reminders] found ${snap.docs.length} undone todo(s)`);

  for (const doc of snap.docs) {
    const todo = doc.data();
    const reminders = todo.reminders || [];

    // D-06: JS filter — Firestore cannot query array subfields
    const due = reminders.filter(
      (r) => !r.fired && r.remindAt <= now && r.remindAt >= windowStart
    );

    const skipped = reminders.filter((r) => !r.fired && r.remindAt < windowStart);
    if (skipped.length > 0) {
      console.log(`[reminders] todo ${doc.id}: ${skipped.length} reminder(s) skipped (outside 30-min window)`);
    }

    if (due.length === 0) continue;
    console.log(`[reminders] todo ${doc.id}: ${due.length} due reminder(s), owner=${todo.ownerId}`);

    const tokensSnap = await db
      .collection('fcmTokens')
      .where('userId', '==', todo.ownerId)
      .get();
    const tokenList = tokensSnap.docs.map((d) => d.data().token);
    console.log(`[reminders] found ${tokenList.length} FCM token(s) for owner=${todo.ownerId}`);

    if (tokenList.length > 0) {
      const response = await msg.sendEachForMulticast({
        tokens: tokenList,
        notification: { title: todo.title, body: 'Reminder' },
        data: { todoId: doc.id },
      });

      // D-05: delete stale tokens that FCM says are unregistered
      if (response.failureCount > 0) {
        const staleDeletes = [];
        response.responses.forEach((resp, idx) => {
          if (
            !resp.success &&
            resp.error &&
            resp.error.code === 'messaging/registration-token-not-registered'
          ) {
            staleDeletes.push(db.collection('fcmTokens').doc(tokenList[idx]).delete());
            console.log(`[reminders] deleted stale token ${tokenList[idx]}`);
          } else if (!resp.success) {
            console.error(`[reminders] FCM send failed for token ${idx}: ${resp.error && resp.error.code}`);
          }
        });
        await Promise.all(staleDeletes);
      }
    }

    // Mark all due reminders as fired (D-08)
    const updated = reminders.map((r) =>
      due.find((d) => d.id === r.id) ? { ...r, fired: true } : r
    );
    await doc.ref.update({ reminders: updated });
  }
}

if (require.main === module) {
  sendDueReminders()
    .then(() => {
      console.log('[reminders] done');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[reminders] error:', err);
      process.exit(1);
    });
}

module.exports = { sendDueReminders };
