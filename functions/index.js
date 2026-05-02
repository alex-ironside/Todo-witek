// Stub Cloud Functions for cross-device reminder push.
// Deploy with: firebase deploy --only functions
//
// Two functions:
// 1. sendDueReminders — runs every minute, finds reminders whose remindAt
//    is in the past and not fired, sends FCM to all device tokens for
//    the owner, and marks them fired.
// 2. (Optional) onTodoWrite — could schedule Cloud Tasks for precise
//    delivery, but a 1-minute scheduler is simpler and good enough.

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

exports.sendDueReminders = functions.pubsub
  .schedule('every 1 minutes')
  .onRun(async () => {
    const now = Date.now();
    const snap = await db.collection('todos').where('done', '==', false).get();

    for (const doc of snap.docs) {
      const todo = doc.data();
      const reminders = todo.reminders || [];
      const due = reminders.filter((r) => !r.fired && r.remindAt <= now);
      if (due.length === 0) continue;

      const tokens = await db
        .collection('fcmTokens')
        .where('userId', '==', todo.ownerId)
        .get();
      const tokenList = tokens.docs.map((d) => d.data().token);

      if (tokenList.length > 0) {
        // Data-only payload: the SW renders the notification. A `notification`
        // field would make the browser auto-display alongside the SW handler,
        // duplicating the toast.
        await messaging.sendEachForMulticast({
          tokens: tokenList,
          data: {
            todoId: doc.id,
            title: todo.title,
            body: 'Reminder',
          },
        });
      }

      const updated = reminders.map((r) =>
        due.find((d) => d.id === r.id) ? { ...r, fired: true } : r
      );
      await doc.ref.update({ reminders: updated });
    }
    return null;
  });
