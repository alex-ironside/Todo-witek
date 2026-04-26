// Wraps the browser Notification API. Falls back gracefully when
// permission is denied or the API is unavailable.

const supported = () =>
  typeof window !== 'undefined' && 'Notification' in window;

export const requestNotificationPermission = async () => {
  if (!supported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
};

export const showLocalNotification = (title, options = {}) => {
  if (!supported() || Notification.permission !== 'granted') return false;
  // Prefer the SW registration so notifications survive tab focus changes.
  if (navigator.serviceWorker?.ready) {
    navigator.serviceWorker.ready
      .then((reg) => reg.showNotification(title, { body: 'Reminder', ...options }))
      .catch(() => new Notification(title, options));
    return true;
  }
  new Notification(title, options);
  return true;
};
