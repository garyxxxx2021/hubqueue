const NOTIFICATION_LS_KEY = 'hubqueue_notifications_enabled';

export function getNotificationPreference(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return localStorage.getItem(NOTIFICATION_LS_KEY) === 'true';
}

export function setNotificationPreference(enabled: boolean): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(NOTIFICATION_LS_KEY, String(enabled));
  }
}
