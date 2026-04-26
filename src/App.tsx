import { useEffect, useMemo, useRef } from 'react';
import type { User } from 'firebase/auth';
import { useAuth } from './hooks/useAuth';
import { useTodos } from './hooks/useTodos';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { logout } from './firebase/auth';
import { updateTodo } from './firebase/todos';
import { isConfigured, vapidKey } from './firebase/config';
import { registerCurrentDeviceForPush } from './firebase/pushTokens';
import {
  createReminderScheduler,
  type ReminderScheduler,
} from './services/reminderScheduler';
import {
  requestNotificationPermission,
  showLocalNotification,
} from './services/notificationService';
import Login from './components/Login';
import TodoForm from './components/TodoForm';
import TodoList from './components/TodoList';

export default function App() {
  if (!isConfigured()) {
    return (
      <div className="app">
        <div className="card">
          <h1>Todo Witek</h1>
          <p>
            Firebase isn't configured yet. Fill in{' '}
            <code>src/firebase/config.ts</code> with your project's web SDK
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

interface AuthenticatedProps {
  user: User;
  online: boolean;
}

function Authenticated({ user, online }: AuthenticatedProps) {
  const { todos, loading } = useTodos(user.uid);
  const schedulerRef = useRef<ReminderScheduler | null>(null);

  // Marking a reminder as fired writes back to Firestore so other devices see it.
  const markFired = useMemo(
    () => async (todoId: string, reminderId: string) => {
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
              registerCurrentDeviceForPush(user.uid).catch((e: Error) =>
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
