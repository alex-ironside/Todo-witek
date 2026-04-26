import { useEffect, useMemo, useRef } from 'react';
import { useAuth } from './hooks/useAuth.js';
import { useTodos } from './hooks/useTodos.js';
import { useOnlineStatus } from './hooks/useOnlineStatus.js';
import { logout } from './firebase/auth.js';
import { updateTodo } from './firebase/todos.js';
import { isConfigured, vapidKey } from './firebase/config.js';
import { registerCurrentDeviceForPush } from './firebase/pushTokens.js';
import { createReminderScheduler } from './services/reminderScheduler.js';
import {
  requestNotificationPermission,
  showLocalNotification,
} from './services/notificationService.js';
import Login from './components/Login.jsx';
import TodoForm from './components/TodoForm.jsx';
import TodoList from './components/TodoList.jsx';

export default function App() {
  if (!isConfigured()) {
    return (
      <div className="app">
        <div className="card">
          <h1>Todo Witek</h1>
          <p>
            Firebase isn't configured yet. Fill in{' '}
            <code>src/firebase/config.js</code> with your project's web SDK
            config (and the matching values in{' '}
            <code>public/firebase-messaging-sw.js</code>) and reload.
          </p>
        </div>
      </div>
    );
  }
  return <AppInner />;
}

function AppInner() {
  const { user, loading } = useAuth();
  const online = useOnlineStatus();

  useEffect(() => {
    if (user) requestNotificationPermission();
  }, [user]);

  if (loading) return <div className="app"><p className="muted">Loading…</p></div>;
  if (!user) return <Login />;
  return <Authenticated user={user} online={online} />;
}

function Authenticated({ user, online }) {
  const { todos, loading } = useTodos(user.uid);
  const schedulerRef = useRef(null);

  // Marking a reminder as fired writes back to Firestore so other devices see it.
  const markFired = useMemo(
    () => async (todoId, reminderId) => {
      const todo = todos.find((t) => t.id === todoId);
      if (!todo) return;
      const next = (todo.reminders || []).map((r) =>
        r.id === reminderId ? { ...r, fired: true } : r
      );
      await updateTodo(todoId, { reminders: next });
    },
    [todos]
  );

  useEffect(() => {
    if (!schedulerRef.current) {
      schedulerRef.current = createReminderScheduler({
        notify: (title, data) =>
          showLocalNotification(title, { body: 'Reminder', data }),
        onFired: (todoId, reminderId) => markFired(todoId, reminderId),
      });
    }
    schedulerRef.current.sync(todos);
    return () => {
      // Stop on unmount only; on every todos change we just resync.
    };
  }, [todos, markFired]);

  useEffect(() => () => schedulerRef.current?.stop(), []);

  return (
    <div className="app">
      <div className="header">
        <div className="brand">Todo Witek</div>
        <div className="row">
          <span className="muted">{user.email}</span>
          <button className="ghost" onClick={() => logout()}>Sign out</button>
        </div>
      </div>
      {!online && (
        <div className="banner warn">
          Offline — changes are saved locally and will sync when you're back online.
        </div>
      )}
      <TodoForm userId={user.uid} />
      <TodoList todos={todos} loading={loading} />
      {vapidKey && (
        <div className="card">
          <button
            className="primary"
            onClick={() =>
              registerCurrentDeviceForPush(user.uid).catch((e) =>
                alert(`Push setup failed: ${e.message}`)
              )
            }
          >
            Enable cross-device push
          </button>
          <p className="muted">
            Saves this device's FCM token so a Cloud Function can deliver
            reminders even when the app is closed.
          </p>
        </div>
      )}
    </div>
  );
}
