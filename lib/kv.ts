export interface PhoneNotification {
  sender: string;
  message: string;
  receivedAt: string;
}

const NOTIFICATION_TTL_MS = 6 * 60 * 60 * 1000;

let latestNotification: PhoneNotification | null = null;

export function setNotification(sender: string, message: string): void {
  latestNotification = { sender, message, receivedAt: new Date().toISOString() };
}

export function getActiveNotification(): PhoneNotification | null {
  if (!latestNotification) return null;

  const age = Date.now() - new Date(latestNotification.receivedAt).getTime();
  if (age > NOTIFICATION_TTL_MS) {
    latestNotification = null;
    return null;
  }

  return latestNotification;
}
