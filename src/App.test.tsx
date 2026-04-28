import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

// ── Mocks (all at top level, before any imports of the module under test) ──

const mockRequestNotificationPermission = vi.fn();
vi.mock('./services/notificationService', () => ({
  requestNotificationPermission: (...a: unknown[]) => mockRequestNotificationPermission(...a),
  showLocalNotification: vi.fn(),
}));

const mockObserveAuth = vi.fn();
vi.mock('./firebase/auth', () => ({
  logout: vi.fn(),
  observeAuth: (...a: unknown[]) => mockObserveAuth(...a),
}));

vi.mock('./firebase/config', () => ({
  isConfigured: () => true,
  firebaseConfig: {},
  vapidKey: null,
}));

vi.mock('./firebase/pushTokens', () => ({
  registerCurrentDeviceForPush: vi.fn(),
  unregisterDeviceToken: vi.fn(),
  getCurrentDeviceToken: vi.fn(),
}));

vi.mock('./hooks/usePushNotifications', () => ({
  usePushNotifications: () => ({
    status: 'unconfigured' as const,
    token: null,
    errorMessage: null,
    bannerMessage: null,
    dismissBanner: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
  }),
}));

vi.mock('./components/PushToggle', () => ({ default: () => null }));

const mockSetMode = vi.fn();
vi.mock('./hooks/useStorageMode', () => ({
  useStorageMode: () => ['firebase', mockSetMode] as const,
}));

vi.mock('./hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => true,
}));

let mockTodosState: { todos: never[]; loading: boolean; error: Error | null } = {
  todos: [],
  loading: false,
  error: null,
};
vi.mock('./hooks/useTodos', () => ({
  useTodos: () => mockTodosState,
}));

vi.mock('./repos/firebaseTodoRepo', () => ({
  createFirebaseTodoRepo: () => ({
    create: vi.fn(), update: vi.fn(), toggleDone: vi.fn(),
    delete: vi.fn(), reorder: vi.fn(), observe: vi.fn(() => () => {}),
  }),
}));

vi.mock('./repos/localTodoRepo', () => ({
  createLocalTodoRepo: () => ({
    create: vi.fn(), update: vi.fn(), toggleDone: vi.fn(),
    delete: vi.fn(), reorder: vi.fn(), observe: vi.fn(() => () => {}),
  }),
}));

vi.mock('./services/reminderScheduler', () => ({
  createReminderScheduler: () => ({ sync: vi.fn(), stop: vi.fn() }),
}));

vi.mock('./components/Login', () => ({ default: () => null }));
vi.mock('./components/TodoForm', () => ({ default: () => null }));
vi.mock('./components/TodoList', () => ({ default: () => null }));
vi.mock('./components/StorageModeToggle', () => ({ default: () => null }));
vi.mock('./components/InstallButton', () => ({ default: () => null }));

// ── Dynamic import after mocks are set up ──
const importApp = async () => (await import('./App')).default;

describe('App regression tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockTodosState = { todos: [], loading: false, error: null };
    // Default: observeAuth calls back with a logged-in user immediately
    mockObserveAuth.mockImplementation((cb: (user: unknown) => void) => {
      cb({ uid: 'user-1', email: 'test@test.com' });
      return () => {};
    });
  });

  it('FirebaseApp does not auto-call requestNotificationPermission when user logs in', async () => {
    const App = await importApp();
    render(<App />);
    expect(mockRequestNotificationPermission).not.toHaveBeenCalled();
  });

  describe('Shell error banner', () => {
    it('shows firestoreNotEnabled banner on permission-denied error', async () => {
      const permErr = Object.assign(new Error('perm'), { code: 'permission-denied' });
      mockTodosState = { todos: [], loading: false, error: permErr };
      const App = await importApp();
      const { getByText, queryByText } = render(<App />);
      expect(getByText(/console\.firebase\.google\.com/)).toBeInTheDocument();
      expect(queryByText(/Nie udało się załadować zadań/)).toBeNull();
    });

    it('shows todosLoadError banner for generic errors', async () => {
      mockTodosState = { todos: [], loading: false, error: new Error('generic') };
      const App = await importApp();
      const { getByText, queryByText } = render(<App />);
      expect(getByText(/Nie udało się załadować zadań/)).toBeInTheDocument();
      expect(queryByText(/console\.firebase\.google\.com/)).toBeNull();
    });
  });
});
