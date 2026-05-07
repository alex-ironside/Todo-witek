import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { useAuth } from './hooks/useAuth';
import { useTodos } from './hooks/useTodos';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useStorageMode } from './hooks/useStorageMode';
import { usePushNotifications, type PushState } from './hooks/usePushNotifications';
import { usePwaInstall } from './hooks/usePwaInstall';
import { RepoProvider } from './hooks/RepoContext';
import { logout } from './firebase/auth';
import { isConfigured } from './firebase/config';
import { createLocalTodoRepo } from './repos/localTodoRepo';
import { createFirebaseTodoRepo } from './repos/firebaseTodoRepo';
import { createLocalCategoryRepo } from './repos/localCategoryRepo';
import { createFirebaseCategoryRepo } from './repos/firebaseCategoryRepo';
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
import AuthRouter from './components/auth/AuthRouter';
import MainList from './components/main-list/MainList';
import UpdatePrompt from './components/UpdatePrompt';
import { t } from './i18n';

export default function App() {
  const [mode, setMode] = useStorageMode();

  return (
    <>
      {mode === 'firebase' && !isConfigured() ? (
        <FirebaseNotConfigured mode={mode} onModeChange={setMode} />
      ) : mode === 'local' ? (
        <LocalApp mode={mode} onModeChange={setMode} />
      ) : (
        <FirebaseApp mode={mode} onModeChange={setMode} />
      )}
      <UpdatePrompt />
    </>
  );
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
          <button
            type="button"
            className="ghost"
            onClick={() =>
              onModeChange(mode === 'local' ? 'firebase' : 'local')
            }
          >
            {mode === 'local' ? t.modeCloud : t.modeLocal}
          </button>
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
  const categoryRepo = useMemo(() => createLocalCategoryRepo(), []);
  const online = useOnlineStatus();

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  return (
    <RepoProvider repo={repo} categoryRepo={categoryRepo}>
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

  if (loading) {
    return <div className="app"><p className="muted">{t.loading}</p></div>;
  }
  if (!user) {
    return <AuthRouter onUseLocal={() => onModeChange('local')} />;
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
  const categoryRepo = useMemo(
    () => createFirebaseCategoryRepo(user.uid),
    [user.uid]
  );
  const push = usePushNotifications(user.uid);
  const signOut = async () => {
    await push.disable();
    await logout();
  };

  return (
    <RepoProvider repo={repo} categoryRepo={categoryRepo}>
      <Shell
        mode={mode}
        onModeChange={onModeChange}
        online={online}
        identity={user.email || t.loginTitle}
        email={user.email}
        signOut={signOut}
        repo={repo}
        push={push}
        pushBanner={push.bannerMessage}
      />
    </RepoProvider>
  );
}

interface ShellProps extends ModeProps {
  online: boolean;
  identity: string;
  email?: string | null;
  signOut: (() => void) | null;
  repo: TodoRepository;
  children?: ReactNode;
  push?: PushState | null;
  pushBanner?: string | null;
}

function Shell({
  mode,
  online,
  identity,
  email = null,
  signOut,
  repo,
  children,
  push = null,
  pushBanner,
}: ShellProps) {
  const { todos, error } = useTodos(repo);
  useReminderScheduler(todos, repo);
  const { canInstall, promptInstall } = usePwaInstall();

  return (
    <div className="app">
      <MainList
        identity={identity}
        email={email}
        onSignOut={signOut ?? undefined}
        push={push}
        canInstall={canInstall}
        onInstall={() => { void promptInstall(); }}
      />
      {pushBanner && <div className="banner warn">{pushBanner}</div>}
      {!online && mode === 'firebase' && (
        <div className="banner warn">{t.offlineBanner}</div>
      )}
      {error && (error as { code?: string }).code === 'permission-denied' ? (
        <div className="banner warn">{t.firestoreNotEnabled}</div>
      ) : error ? (
        <div className="banner warn">{t.todosLoadError}</div>
      ) : null}
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
