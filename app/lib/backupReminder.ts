/**
 * Tracks the timestamp of the last successful backup (ZIP export) in localStorage.
 * Pure logic separated for testability.
 */

const STORAGE_KEY = 'fitly:lastBackupAt';
export const BACKUP_NUDGE_THRESHOLD_DAYS = 14;

export function getLastBackupAt(storage: Storage = localStorage): number | undefined {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return undefined;
  const ts = Number(raw);
  return Number.isFinite(ts) && ts > 0 ? ts : undefined;
}

export function markBackupDone(now: number = Date.now(), storage: Storage = localStorage): void {
  storage.setItem(STORAGE_KEY, String(now));
}

/** Days elapsed since last backup. Infinity when never backed up. */
export function daysSinceLastBackup(lastBackupAt: number | undefined, now: number): number {
  if (!lastBackupAt) return Infinity;
  return Math.max(0, (now - lastBackupAt) / (1000 * 60 * 60 * 24));
}

export interface BackupNudge {
  level: 'never' | 'stale' | 'none';
  message?: string;
}

export function getBackupNudge(lastBackupAt: number | undefined, now: number): BackupNudge {
  const days = daysSinceLastBackup(lastBackupAt, now);
  if (!lastBackupAt) {
    return { level: 'never', message: 'You have never backed up your wardrobe. Export a ZIP backup to keep your data safe.' };
  }
  if (days >= BACKUP_NUDGE_THRESHOLD_DAYS) {
    return { level: 'stale', message: `Last backup was ${Math.floor(days)} days ago. Consider exporting a fresh one.` };
  }
  return { level: 'none' };
}
