// Wraps the browser Notification API. Falls back gracefully when
// permission is denied or the API is unavailable.

const supported = (): boolean =>
  typeof window !== 'undefined' && 'Notification' in window;

export type PermissionResult = NotificationPermission | 'unsupported';

export const requestNotificationPermission = async (): Promise<PermissionResult> => {
  if (!supported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
};

export const showLocalNotification = (
  title: string,
  options: NotificationOptions = {}
): boolean => {
  if (!supported() || Notification.permission !== 'granted') return false;
  const merged: NotificationOptions = { body: 'Reminder', ...options };
  if (navigator.serviceWorker?.ready) {
    navigator.serviceWorker.ready
      .then((reg) => reg.showNotification(title, merged))
      .catch(() => new Notification(title, merged));
    return true;
  }
  new Notification(title, merged);
  return true;
};
