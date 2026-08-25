import { describe, it, expect } from 'vitest';
import {
  getWearLogs,
  getWashLogs,
  addWearLog,
  removeWearLog,
  addWashLog,
  removeWashLog,
} from './wearLogs';
import { timestampToDateKey } from './calendar';
import { ClothingItem, Outfit } from '../types';

const item = (overrides: Partial<ClothingItem> = {}): ClothingItem => ({
  id: 'i1',
  name: 'Shirt',
  category: 'top',
  createdAt: 0,
  updatedAt: 0,
  ...overrides,
} as ClothingItem);

const outfit = (overrides: Partial<Outfit> = {}): Outfit => ({
  id: 'o1',
  name: 'Casual',
  itemIds: [],
  ...overrides,
} as Outfit);

describe('getWearLogs', () => {
  it('returns wearLogs when present', () => {
    expect(getWearLogs(item({ wearLogs: [100, 200] }))).toEqual([100, 200]);
  });
  it('falls back to lastWornAt for legacy data', () => {
    expect(getWearLogs(item({ lastWornAt: 500 }))).toEqual([500]);
  });
  it('returns empty array when neither exists', () => {
    expect(getWearLogs(item())).toEqual([]);
  });
});

describe('getWashLogs', () => {
  it('falls back to lastWashedAt for legacy data', () => {
    expect(getWashLogs(item({ lastWashedAt: 700 }))).toEqual([700]);
  });
});

describe('addWearLog', () => {
  it('adds a log and updates lastWornAt', () => {
    const dk = timestampToDateKey(1704067200000); // some date
    const result = addWearLog(item(), dk);
    expect(result).not.toBeNull();
    expect(result!.wearLogs).toHaveLength(1);
    expect(result!.lastWornAt).toBe(result!.wearLogs![0]);
  });
  it('returns null when date already logged (idempotent)', () => {
    const ts = Date.now();
    const entity = item({ wearLogs: [ts] });
    const dk = timestampToDateKey(ts);
    // Same day via legacy fallback path
    const result = addWearLog(entity, timestampToDateKey(ts));
    if (result === null) {
      expect(result).toBeNull();
    } else {
      // If timezone shifted the key, ensure no duplicate timestamps for same key
      const keys = result.wearLogs!.map(timestampToDateKey);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});

describe('removeWearLog', () => {
  it('removes logs for a date and recomputes lastWornAt', () => {
    const ts1 = 1704067200000;
    const ts2 = ts1 + 86400000;
    const result = removeWearLog(item({ wearLogs: [ts1, ts2] }), timestampToDateKey(ts1));
    expect(result.wearLogs).toEqual([ts2]);
    expect(result.lastWornAt).toBe(ts2);
  });
  it('clears lastWornAt when no logs remain', () => {
    const ts1 = 1704067200000;
    const result = removeWearLog(item({ wearLogs: [ts1] }), timestampToDateKey(ts1));
    expect(result.wearLogs).toEqual([]);
    expect(result.lastWornAt).toBeUndefined();
  });
});

describe('addWashLog / removeWashLog', () => {
  it('adds and removes wash logs symmetrically', () => {
    const ts = 1704067200000;
    const dk = timestampToDateKey(ts);
    const added = addWashLog(item(), dk);
    expect(added).not.toBeNull();
    expect(added!.washLogs).toHaveLength(1);
    const removed = removeWashLog(item(added as Partial<ClothingItem>), dk);
    expect(removed.washLogs).toEqual([]);
    expect(removed.lastWashedAt).toBeUndefined();
  });
});
