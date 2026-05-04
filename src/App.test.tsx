import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';

// ── Mocks (all at top level, before any imports of the module under test) ──

const mockRequestNotificationPermission = vi.fn();
vi.mock('./services/notificationService', () => ({
  requestNotificationPermission: (...a: unknown[]) => mockRequestNotificationPermission(...a),
  showLocalNotification: vi.fn(),
}));

const mockLogout = vi.fn();
const mockObserveAuth = vi.fn();
vi.mock('./firebase/auth', () => ({
  logout: (...a: unknown[]) => mockLogout(...a),
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

const mockPushDisable = vi.fn();
const mockPushEnable = vi.fn();
let mockPushState: {
  status: 'unconfigured' | 'enabled' | 'idle';
  token: string | null;
} = { status: 'unconfigured', token: null };
vi.mock('./hooks/usePushNotifications', () => ({
  usePushNotifications: () => ({
    status: mockPushState.status,
    token: mockPushState.token,
    errorMessage: null,
    bannerMessage: null,
    dismissBanner: vi.fn(),
    enable: mockPushEnable,
    disable: mockPushDisable,
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

vi.mock('./components/auth/AuthRouter', () => ({ default: () => null }));
vi.mock('./components/main-list/MainList', () => ({ default: () => null }));
vi.mock('./components/StorageModeToggle', () => ({ default: () => null }));
vi.mock('./components/InstallButton', () => ({ default: () => null }));

// ── Dynamic import after mocks are set up ──
const importApp = async () => (await import('./App')).default;

describe('App regression tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockTodosState = { todos: [], loading: false, error: null };
    mockPushState = { status: 'unconfigured', token: null };
    mockPushDisable.mockResolvedValue(undefined);
    mockPushEnable.mockResolvedValue(undefined);
    mockLogout.mockResolvedValue(undefined);
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

  describe('signOut cleans up push registration', () => {
    // Regression: account A's FCM token doc is owned by A in Firestore. After
    // logout, when account B logs in on the same device, FCM returns the same
    // device token; setDoc on that token attempts to update an A-owned doc and
    // is blocked by `match /fcmTokens/{id}` rule `allow update: if false`.
    // The fix is to delete the device's token doc while still authenticated as
    // A so a fresh `create` succeeds for B.
    it('calls push.disable() before logout() so the FCM token doc is removed while still authenticated', async () => {
      mockPushState = { status: 'enabled', token: 'tok-A' };
      const App = await importApp();
      const { getByText } = render(<App />);
      const signOutBtn = getByText('Wyloguj');
      await act(async () => {
        fireEvent.click(signOutBtn);
      });
      expect(mockPushDisable).toHaveBeenCalledTimes(1);
      expect(mockLogout).toHaveBeenCalledTimes(1);
      const disableOrder = mockPushDisable.mock.invocationCallOrder[0];
      const logoutOrder = mockLogout.mock.invocationCallOrder[0];
      expect(disableOrder).toBeLessThan(logoutOrder);
    });

    it('still logs out when push is unconfigured (disable is a no-op)', async () => {
      mockPushState = { status: 'unconfigured', token: null };
      const App = await importApp();
      const { getByText } = render(<App />);
      const signOutBtn = getByText('Wyloguj');
      await act(async () => {
        fireEvent.click(signOutBtn);
      });
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });
});
