import { describe, it, expect } from 'vitest';
import {
  formatDateKey,
  timestampToDateKey,
  dateKeyToTimestamp,
  getWeekStart,
  getWeekEnd,
  getDayLogSummary,
  getCalendarWeek,
  getCalendarMonth,
  getMonthLabel,
  getPreviousMonth,
  getNextMonth,
} from './calendar';
import { ClothingItem, Outfit, PlannedOutfit } from '../types';

describe('calendar domain functions', () => {
  it('should format date key correctly in YYYY-MM-DD format', () => {
    const d = new Date(2026, 7, 8); // Aug 8, 2026
    expect(formatDateKey(d)).toBe('2026-08-08');
  });

  it('should convert timestamp to dateKey and dateKey back to timestamp accurately', () => {
    const dateKey = '2026-08-08';
    const ts = dateKeyToTimestamp(dateKey);
    expect(timestampToDateKey(ts)).toBe(dateKey);
  });

  it('should get correct week start (Monday) and week end (Sunday)', () => {
    const Saturday = new Date(2026, 7, 8); // Aug 8, 2026 (Saturday)
    const start = getWeekStart(Saturday);
    const end = getWeekEnd(Saturday);

    expect(start.getDay()).toBe(1); // Monday
    expect(end.getDay()).toBe(0); // Sunday
    expect(formatDateKey(start)).toBe('2026-08-03');
    expect(formatDateKey(end)).toBe('2026-08-09');
  });

  it('should calculate DayLogSummary matching wear logs, wash logs, and plans', () => {
    const targetKey = '2026-08-08';
    const targetTs = dateKeyToTimestamp(targetKey);

    const mockItem: ClothingItem = {
      id: 'item-1',
      name: 'Denim Jacket',
      category: 'outerwear',
      status: 'ready',
      wearLogs: [targetTs],
      washLogs: [targetTs],
      createdAt: targetTs,
    };

    const mockOutfit: Outfit = {
      id: 'outfit-1',
      name: 'Casual Saturday',
      itemIds: ['item-2'],
      wearLogs: [targetTs],
      createdAt: targetTs,
    };

    const mockPlan: PlannedOutfit = {
      id: 'plan-1',
      date: targetKey,
      outfitId: 'outfit-1',
      itemIds: ['item-2'],
    };

    const summary = getDayLogSummary(targetKey, [mockPlan], [mockOutfit], [mockItem]);

    expect(summary.dateKey).toBe(targetKey);
    expect(summary.wornOutfits).toHaveLength(1);
    expect(summary.wornOutfits[0].id).toBe('outfit-1');
    expect(summary.wornItems).toHaveLength(1);
    expect(summary.wornItems[0].id).toBe('item-1');
    expect(summary.washedItems).toHaveLength(1);
    expect(summary.washedItems[0].id).toBe('item-1');
    expect(summary.plannedOutfits).toHaveLength(1);
  });

  it('should generate a 7-day calendar week with summary data', () => {
    const today = new Date(2026, 7, 8);
    const week = getCalendarWeek(today, [], [], []);

    expect(week.days).toHaveLength(7);
    expect(week.days[0].dayOfWeek).toBe(1); // Monday
    expect(week.days[6].dayOfWeek).toBe(0); // Sunday
  });

  it('should generate full calendar month with 35 or 42 grid days', () => {
    const month = getCalendarMonth(2026, 7, [], [], []); // August 2026
    expect(month.days.length % 7).toBe(0);
    expect(month.label).toBe('August 2026');
  });

  it('should navigate months backwards and forwards correctly', () => {
    expect(getPreviousMonth(2026, 0)).toEqual({ year: 2025, month: 11 });
    expect(getNextMonth(2026, 11)).toEqual({ year: 2027, month: 0 });
    expect(getMonthLabel(2026, 7)).toBe('August 2026');
  });
});
