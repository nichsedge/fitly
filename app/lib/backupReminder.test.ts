import { describe, it, expect, beforeEach } from 'vitest';
import {
  getLastBackupAt,
  markBackupDone,
  daysSinceLastBackup,
  getBackupNudge,
  BACKUP_NUDGE_THRESHOLD_DAYS,
} from './backupReminder';

const DAY = 1000 * 60 * 60 * 24;

describe('backupReminder', () => {
  let store: Record<string, string>;
  const fakeStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
  } as Storage;

  beforeEach(() => { store = {}; });

  it('returns undefined when never backed up', () => {
    expect(getLastBackupAt(fakeStorage)).toBeUndefined();
  });

  it('marks and reads back a backup timestamp', () => {
    markBackupDone(1234567, fakeStorage);
    expect(getLastBackupAt(fakeStorage)).toBe(1234567);
  });

  it('ignores corrupted stored values', () => {
    store['fitly:lastBackupAt'] = 'not-a-number';
    expect(getLastBackupAt(fakeStorage)).toBeUndefined();
  });

  it('computes Infinity when no backup exists', () => {
    expect(daysSinceLastBackup(undefined, Date.now())).toBe(Infinity);
  });

  it('computes elapsed days', () => {
    const now = 10 * DAY;
    expect(daysSinceLastBackup(4 * DAY, now)).toBe(6);
  });

  it('nudges with level "never" for new users', () => {
    const nudge = getBackupNudge(undefined, Date.now());
    expect(nudge.level).toBe('never');
    expect(nudge.message).toBeTruthy();
  });

  it(`nudges as stale at >= ${BACKUP_NUDGE_THRESHOLD_DAYS} days`, () => {
    const now = Date.now();
    const nudge = getBackupNudge(now - (BACKUP_NUDGE_THRESHOLD_DAYS + 1) * DAY, now);
    expect(nudge.level).toBe('stale');
    expect(nudge.message).toContain('15 days ago');
  });

  it('stays silent for recent backups', () => {
    const now = Date.now();
    expect(getBackupNudge(now - 2 * DAY, now).level).toBe('none');
  });
});
