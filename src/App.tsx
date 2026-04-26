import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { useAuth } from './hooks/useAuth';
import { useTodos } from './hooks/useTodos';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useStorageMode } from './hooks/useStorageMode';
import { RepoProvider } from './hooks/RepoContext';
import { logout } from './firebase/auth';
import { isConfigured, vapidKey } from './firebase/config';
import { registerCurrentDeviceForPush } from './firebase/pushTokens';
import { createLocalTodoRepo } from './repos/localTodoRepo';
import { createFirebaseTodoRepo } from './repos/firebaseTodoRepo';
import {
  createReminderScheduler,
  type ReminderScheduler,
} from './services/reminderScheduler';
import {
  requestNotificationPermission,
  showLocalNotification,
} from './services/notificationService';
import type { StorageMode } from './services/storageMode';
import type { Todo, TodoRepository } from './types';
import Login from './components/Login';
import TodoForm from './components/TodoForm';
import TodoList from './components/TodoList';
import StorageModeToggle from './components/StorageModeToggle';
import InstallButton from './components/InstallButton';
import { t } from './i18n';

export default function App() {
  const [mode, setMode] = useStorageMode();

  if (mode === 'firebase' && !isConfigured()) {
    return <FirebaseNotConfigured mode={mode} onModeChange={setMode} />;
  }
  if (mode === 'local') {
    return <LocalApp mode={mode} onModeChange={setMode} />;
  }
  return <FirebaseApp mode={mode} onModeChange={setMode} />;
}

interface ModeProps {
  mode: StorageMode;
  onModeChange: (mode: StorageMode) => void;
}

function FirebaseNotConfigured({ mode, onModeChange }: ModeProps) {
  return (
    <div className="app">
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h1>{t.brand}</h1>
          <div className="row">
            <InstallButton />
            <StorageModeToggle mode={mode} onChange={onModeChange} />
          </div>
        </div>
        <p>
          {t.notConfigured} <code>src/firebase/config.ts</code>{' '}
          {t.notConfiguredAndIn}{' '}
          <code>public/firebase-messaging-sw.js</code>
          {t.notConfiguredEnd}
        </p>
      </div>
    </div>
  );
}

function LocalApp({ mode, onModeChange }: ModeProps) {
  const repo = useMemo(() => createLocalTodoRepo(), []);
  const online = useOnlineStatus();

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  return (
    <RepoProvider repo={repo}>
      <Shell
        mode={mode}
        onModeChange={onModeChange}
        online={online}
        identity={t.identityLocal}
        signOut={null}
        repo={repo}
      />
    </RepoProvider>
  );
}

function FirebaseApp({ mode, onModeChange }: ModeProps) {
  const { user, loading } = useAuth();
  const online = useOnlineStatus();

  useEffect(() => {
    if (user) requestNotificationPermission();
  }, [user]);

  if (loading) {
    return <div className="app"><p className="muted">{t.loading}</p></div>;
  }
  if (!user) {
    return <Login mode={mode} onModeChange={onModeChange} />;
  }
  return (
    <FirebaseAuthenticated
      user={user}
      online={online}
      mode={mode}
      onModeChange={onModeChange}
    />
  );
}

interface FirebaseAuthenticatedProps extends ModeProps {
  user: User;
  online: boolean;
}

function FirebaseAuthenticated({
  user,
  online,
  mode,
  onModeChange,
}: FirebaseAuthenticatedProps) {
  const repo = useMemo(() => createFirebaseTodoRepo(user.uid), [user.uid]);

  return (
    <RepoProvider repo={repo}>
      <Shell
        mode={mode}
        onModeChange={onModeChange}
        online={online}
        identity={user.email || t.loginTitle}
        signOut={() => logout()}
        repo={repo}
      >
        {vapidKey && (
          <div className="card">
            <button
              className="primary"
              onClick={() =>
                registerCurrentDeviceForPush(user.uid).catch((e: Error) =>
                  alert(`${t.pushSetupFailed}: ${e.message}`)
                )
              }
            >
              {t.pushEnable}
            </button>
            <p className="muted">{t.pushHint}</p>
          </div>
        )}
      </Shell>
    </RepoProvider>
  );
}

interface ShellProps extends ModeProps {
  online: boolean;
  identity: string;
  signOut: (() => void) | null;
  repo: TodoRepository;
  children?: ReactNode;
}

function Shell({
  mode,
  onModeChange,
  online,
  identity,
  signOut,
  repo,
  children,
}: ShellProps) {
  const { todos, loading } = useTodos(repo);
  useReminderScheduler(todos, repo);

  return (
    <div className="app">
      <div className="header">
        <div className="brand">{t.brand}</div>
        <div className="row">
          <InstallButton />
          <StorageModeToggle mode={mode} onChange={onModeChange} />
          <span className="muted">{identity}</span>
          {signOut && (
            <button className="ghost" onClick={signOut}>{t.signOut}</button>
          )}
        </div>
      </div>
      {!online && mode === 'firebase' && (
        <div className="banner warn">{t.offlineBanner}</div>
      )}
      <TodoForm />
      <TodoList todos={todos} loading={loading} />
      {children}
    </div>
  );
}

// Schedules in-app reminder notifications for the active repo.
// Marking fired writes back through the repo so other devices/tabs see it.
function useReminderScheduler(todos: Todo[], repo: TodoRepository): void {
  const schedulerRef = useRef<ReminderScheduler | null>(null);

  const markFired = useMemo(
    () => async (todoId: string, reminderId: string) => {
      const todo = todos.find((t) => t.id === todoId);
      if (!todo) return;
      const next = (todo.reminders || []).map((r) =>
        r.id === reminderId ? { ...r, fired: true } : r
      );
      await repo.update(todoId, { reminders: next });
    },
    [todos, repo]
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
}
