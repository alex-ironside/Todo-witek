'use strict';
// Integration tests for send-reminders.cjs
// Requires FIRESTORE_EMULATOR_HOST to be set before this runs.
// Run via: npx firebase emulators:exec --only firestore "npm run test:scripts" --project todo-witek

const { getApps, deleteApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// The script under test — initializeApp() runs at module load.
// emulators:exec sets FIRESTORE_EMULATOR_HOST automatically.
const { sendDueReminders } = require('./send-reminders.cjs');

let db;
let mockSendEachForMulticast;
let fakeMessaging;

beforeEach(async () => {
  mockSendEachForMulticast = (() => {
    const calls = [];
    let impl = () => Promise.resolve({ successCount: 0, failureCount: 0, responses: [] });
    const fn = (...args) => { calls.push(args); return impl(...args); };
    fn.mockResolvedValue = (val) => { impl = () => Promise.resolve(val); };
    fn.mock = { get calls() { return calls; } };
    fn.toHaveBeenCalledOnce = () => calls.length === 1;
    fn.toHaveBeenCalled = () => calls.length > 0;
    fn.clear = () => { calls.length = 0; };
    return fn;
  })();
  fakeMessaging = { sendEachForMulticast: mockSendEachForMulticast };

  db = getFirestore();
  // Clear test data between tests
  const todos = await db.collection('todos').get();
  const tokens = await db.collection('fcmTokens').get();
  const batch = db.batch();
  todos.docs.forEach((d) => batch.delete(d.ref));
  tokens.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
});

afterAll(async () => {
  const apps = getApps();
  await Promise.all(apps.map((a) => deleteApp(a)));
});

describe('sendDueReminders', () => {
  it('Test A: fires FCM for reminder within 30-min window', async () => {
    const remindAt = Date.now() - 10 * 60 * 1000;
    await db.collection('fcmTokens').doc('token-abc').set({ userId: 'user1', token: 'token-abc' });
    await db.collection('todos').add({
      ownerId: 'user1', done: false, title: 'Test todo',
      reminders: [{ id: 'r1', remindAt, fired: false }],
    });
    mockSendEachForMulticast.mockResolvedValue({
      successCount: 1, failureCount: 0,
      responses: [{ success: true }],
    });

    await sendDueReminders(fakeMessaging);

    expect(mockSendEachForMulticast.mock.calls.length).toBe(1);
    const call = mockSendEachForMulticast.mock.calls[0][0];
    expect(call.tokens).toContain('token-abc');
    const todos = await db.collection('todos').where('done', '==', false).get();
    const reminder = todos.docs[0].data().reminders[0];
    expect(reminder.fired).toBe(true);
  });

  it('Test B: skips reminder older than 30 minutes (D-06 look-back)', async () => {
    const remindAt = Date.now() - 45 * 60 * 1000;
    await db.collection('fcmTokens').doc('token-abc').set({ userId: 'user1', token: 'token-abc' });
    await db.collection('todos').add({
      ownerId: 'user1', done: false, title: 'Old todo',
      reminders: [{ id: 'r1', remindAt, fired: false }],
    });

    await sendDueReminders(fakeMessaging);

    expect(mockSendEachForMulticast.mock.calls.length).toBe(0);
  });

  it('Test C: skips reminder not yet due', async () => {
    const remindAt = Date.now() + 5 * 60 * 1000;
    await db.collection('fcmTokens').doc('token-abc').set({ userId: 'user1', token: 'token-abc' });
    await db.collection('todos').add({
      ownerId: 'user1', done: false, title: 'Future todo',
      reminders: [{ id: 'r1', remindAt, fired: false }],
    });

    await sendDueReminders(fakeMessaging);

    expect(mockSendEachForMulticast.mock.calls.length).toBe(0);
  });

  it('Test D: deletes stale token on registration-token-not-registered (D-05)', async () => {
    const remindAt = Date.now() - 5 * 60 * 1000;
    await db.collection('fcmTokens').doc('stale-token').set({ userId: 'user1', token: 'stale-token' });
    await db.collection('fcmTokens').doc('good-token').set({ userId: 'user1', token: 'good-token' });
    await db.collection('todos').add({
      ownerId: 'user1', done: false, title: 'Test todo',
      reminders: [{ id: 'r1', remindAt, fired: false }],
    });
    // Firestore returns docs alphabetically: good-token (idx 0), stale-token (idx 1)
    mockSendEachForMulticast.mockResolvedValue({
      successCount: 1, failureCount: 1,
      responses: [
        { success: true },
        { success: false, error: { code: 'messaging/registration-token-not-registered' } },
      ],
    });

    await sendDueReminders(fakeMessaging);

    const stale = await db.collection('fcmTokens').doc('stale-token').get();
    const good = await db.collection('fcmTokens').doc('good-token').get();
    expect(stale.exists).toBe(false);
    expect(good.exists).toBe(true);
  });

  it('Test E: marks reminder fired in Firestore after send (D-08)', async () => {
    const remindAt = Date.now() - 10 * 60 * 1000;
    await db.collection('fcmTokens').doc('token-abc').set({ userId: 'user1', token: 'token-abc' });
    const ref = await db.collection('todos').add({
      ownerId: 'user1', done: false, title: 'Mark fired',
      reminders: [{ id: 'r1', remindAt, fired: false }],
    });
    mockSendEachForMulticast.mockResolvedValue({
      successCount: 1, failureCount: 0,
      responses: [{ success: true }],
    });

    await sendDueReminders(fakeMessaging);

    const snap = await ref.get();
    const reminders = snap.data().reminders;
    expect(reminders.find((r) => r.id === 'r1').fired).toBe(true);
  });
});
