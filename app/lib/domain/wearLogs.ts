import { ClothingItem, Outfit } from '../types';
import { timestampToDateKey, dateKeyToTimestamp } from './calendar';

/**
 * Pure helpers for wear/wash log mutations.
 * All functions are immutable and side-effect free so they can be unit tested.
 */

/** Normalize an entity's wear logs, falling back to lastWornAt for legacy data. */
export function getWearLogs(entity: ClothingItem | Outfit): number[] {
  if (entity.wearLogs && entity.wearLogs.length > 0) return entity.wearLogs;
  return entity.lastWornAt ? [entity.lastWornAt] : [];
}

export function getWashLogs(item: ClothingItem): number[] {
  if (item.washLogs && item.washLogs.length > 0) return item.washLogs;
  return item.lastWashedAt ? [item.lastWashedAt] : [];
}

/**
 * Add a wear log for a dateKey if not already present.
 * Returns null if already logged, otherwise patch fields.
 */
export function addWearLog(
  entity: ClothingItem | Outfit,
  dateKey: string,
): Pick<ClothingItem, 'wearLogs' | 'lastWornAt'> | null {
  const existing = getWearLogs(entity);
  if (existing.some(ts => timestampToDateKey(ts) === dateKey)) return null;
  const updated = [...existing, dateKeyToTimestamp(dateKey)];
  return { wearLogs: updated, lastWornAt: Math.max(...updated) };
}

/** Remove all wear logs matching a dateKey. Returns patch fields. */
export function removeWearLog(
  entity: ClothingItem | Outfit,
  dateKey: string,
): Pick<ClothingItem, 'wearLogs' | 'lastWornAt'> {
  const updated = getWearLogs(entity).filter(ts => timestampToDateKey(ts) !== dateKey);
  return {
    wearLogs: updated,
    lastWornAt: updated.length > 0 ? Math.max(...updated) : undefined,
  };
}

/**
 * Add a wash log for a dateKey if not already present.
 * Returns null if already logged, otherwise patch fields.
 */
export function addWashLog(
  item: ClothingItem,
  dateKey: string,
): Pick<ClothingItem, 'washLogs' | 'lastWashedAt'> | null {
  const existing = getWashLogs(item);
  if (existing.some(ts => timestampToDateKey(ts) === dateKey)) return null;
  const updated = [...existing, dateKeyToTimestamp(dateKey)];
  return { washLogs: updated, lastWashedAt: Math.max(...updated) };
}

/** Remove all wash logs matching a dateKey. Returns patch fields. */
export function removeWashLog(
  item: ClothingItem,
  dateKey: string,
): Pick<ClothingItem, 'washLogs' | 'lastWashedAt'> {
  const updated = getWashLogs(item).filter(ts => timestampToDateKey(ts) !== dateKey);
  return {
    washLogs: updated,
    lastWashedAt: updated.length > 0 ? Math.max(...updated) : undefined,
  };
}
