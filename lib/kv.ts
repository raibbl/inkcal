export interface PhoneNotification {
  sender: string;
  message: string;
  receivedAt: string;
}

const NOTIFICATION_TTL_MS = 30 * 60 * 1000;

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

// Called when the MENU button explicitly requests ?ack=1 - a manual
// refresh counts as "seen", so it clears immediately rather than
// waiting out the TTL. Other triggers (theme/size/page switches, the
// automatic polling timers) don't acknowledge.
export function clearNotification(): void {
  latestNotification = null;
}
