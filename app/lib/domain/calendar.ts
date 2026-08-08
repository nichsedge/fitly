import { PlannedOutfit, ClothingItem, Outfit } from '../types';

export type RetirementReason = 'donated' | 'sold' | 'recycled' | 'discarded';

export interface CalendarWeek {
  startDate: Date;
  endDate: Date;
  days: CalendarDay[];
}

export interface CalendarDay {
  date: Date;
  dateKey: string; // YYYY-MM-DD
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  isToday: boolean;
  isCurrentMonth: boolean;
  isPast: boolean;
  isFuture: boolean;
  plannedOutfits: PlannedOutfit[];
  wornOutfits: Outfit[];
  wornItems: ClothingItem[];
  washedItems: ClothingItem[];
  outfitNames: string[];
  itemCount: number;
  totalLogsCount: number;
}

export interface DragItem {
  type: 'outfit' | 'item';
  id: string;
  dateKey?: string; // source date for moving existing plans
}

export interface DayLogSummary {
  dateKey: string;
  dateObj: Date;
  plannedOutfits: PlannedOutfit[];
  wornOutfits: Outfit[];
  wornItems: ClothingItem[];
  washedItems: ClothingItem[];
}

/**
 * Format date as YYYY-MM-DD in local time
 */
export function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Convert timestamp (ms) to YYYY-MM-DD date key
 */
export function timestampToDateKey(ts: number): string {
  return formatDateKey(new Date(ts));
}

/**
 * Convert YYYY-MM-DD date key to a timestamp (noon local time)
 */
export function dateKeyToTimestamp(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map(Number);
  const d = new Date(year, month - 1, day, 12, 0, 0, 0);
  return d.getTime();
}

/**
 * Get start of week (Monday) for a given date
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday = 1
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get end of week (Sunday) for a given date
 */
export function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Get day log summary for a specific dateKey
 */
export function getDayLogSummary(
  dateKey: string,
  plans: PlannedOutfit[] = [],
  outfits: Outfit[] = [],
  items: ClothingItem[] = []
): DayLogSummary {
  const [year, month, day] = dateKey.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day, 12, 0, 0, 0);

  // Planned outfits
  const plannedOutfits = plans.filter(p => p.date === dateKey);

  // Worn outfits matching dateKey
  const wornOutfits = outfits.filter(outfit => {
    const logs = outfit.wearLogs || (outfit.lastWornAt ? [outfit.lastWornAt] : []);
    return logs.some(ts => timestampToDateKey(ts) === dateKey);
  });

  // Worn items matching dateKey (excluding items worn as part of a worn outfit today to avoid duplication)
  const wornOutfitItemIds = new Set(wornOutfits.flatMap(o => o.itemIds));
  const wornItems = items.filter(item => {
    if (wornOutfitItemIds.has(item.id)) return false;
    const logs = item.wearLogs || (item.lastWornAt ? [item.lastWornAt] : []);
    return logs.some(ts => timestampToDateKey(ts) === dateKey);
  });

  // Washed items matching dateKey
  const washedItems = items.filter(item => {
    const washLogs = item.washLogs || (item.lastWashedAt ? [item.lastWashedAt] : []);
    return washLogs.some(ts => timestampToDateKey(ts) === dateKey);
  });

  return {
    dateKey,
    dateObj,
    plannedOutfits,
    wornOutfits,
    wornItems,
    washedItems,
  };
}

/**
 * Generate a calendar week (Mon-Sun) for a given date, including wear and wash logs
 */
export function getCalendarWeek(
  date: Date, 
  plans: PlannedOutfit[] = [], 
  outfits: Outfit[] = [], 
  items: ClothingItem[] = []
): CalendarWeek {
  const startDate = getWeekStart(date);
  const endDate = getWeekEnd(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days: CalendarDay[] = [];
  
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(startDate);
    dayDate.setDate(startDate.getDate() + i);
    
    const dateKey = formatDateKey(dayDate);
    const isToday = dayDate.getTime() === today.getTime();
    const isPast = dayDate < today;
    const isFuture = dayDate > today;
    
    const summary = getDayLogSummary(dateKey, plans, outfits, items);
    
    const outfitNames = [
      ...summary.wornOutfits.map(o => o.name),
      ...summary.plannedOutfits
        .filter(p => p.outfitId)
        .map(p => outfits.find(o => o.id === p.outfitId)?.name)
        .filter(Boolean) as string[]
    ];
    
    const itemCount = summary.wornItems.length + summary.plannedOutfits.reduce((c, p) => c + p.itemIds.length, 0);
    const totalLogsCount = summary.wornOutfits.length + summary.wornItems.length + summary.washedItems.length + summary.plannedOutfits.length;

    days.push({
      date: dayDate,
      dateKey,
      dayOfWeek: dayDate.getDay(),
      isToday,
      isCurrentMonth: dayDate.getMonth() === date.getMonth(),
      isPast,
      isFuture,
      plannedOutfits: summary.plannedOutfits,
      wornOutfits: summary.wornOutfits,
      wornItems: summary.wornItems,
      washedItems: summary.washedItems,
      outfitNames,
      itemCount,
      totalLogsCount,
    });
  }

  return {
    startDate,
    endDate,
    days,
  };
}

/**
 * Format date for display (e.g., "Mon, Jan 15")
 */
export function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/**
 * Format day name (Mon, Tue, etc.)
 */
export function formatDayName(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

/**
 * Get day name abbreviation (M, T, W, T, F, S, S)
 */
export function getDayAbbreviation(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'narrow' });
}

/**
 * Navigate to previous week
 */
export function getPreviousWeek(date: Date): Date {
  const prev = new Date(date);
  prev.setDate(date.getDate() - 7);
  return prev;
}

/**
 * Navigate to next week
 */
export function getNextWeek(date: Date): Date {
  const next = new Date(date);
  next.setDate(date.getDate() + 7);
  return next;
}

/**
 * Navigate to current week
 */
export function getCurrentWeek(): Date {
  return getWeekStart(new Date());
}

export interface CalendarMonth {
  year: number;
  month: number;
  label: string;
  startDate: Date;
  endDate: Date;
  days: CalendarDay[];
}

/**
 * Generate a full month calendar grid (including padded days from prev/next months)
 */
export function getCalendarMonth(
  year: number,
  month: number,
  plans: PlannedOutfit[] = [],
  outfits: Outfit[] = [],
  items: ClothingItem[] = []
): CalendarMonth {
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const startDate = getWeekStart(firstDayOfMonth);
  const endDate = getWeekEnd(lastDayOfMonth);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days: CalendarDay[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const dayDate = new Date(current);
    const dateKey = formatDateKey(dayDate);
    const isToday = dayDate.getTime() === today.getTime();
    const isPast = dayDate < today;
    const isFuture = dayDate > today;
    const isCurrentMonth = dayDate.getMonth() === month;

    const summary = getDayLogSummary(dateKey, plans, outfits, items);

    const outfitNames = [
      ...summary.wornOutfits.map(o => o.name),
      ...summary.plannedOutfits
        .filter(p => p.outfitId)
        .map(p => outfits.find(o => o.id === p.outfitId)?.name)
        .filter(Boolean) as string[]
    ];

    const itemCount = summary.wornItems.length + summary.plannedOutfits.reduce((c, p) => c + p.itemIds.length, 0);
    const totalLogsCount = summary.wornOutfits.length + summary.wornItems.length + summary.washedItems.length + summary.plannedOutfits.length;

    days.push({
      date: dayDate,
      dateKey,
      dayOfWeek: dayDate.getDay(),
      isToday,
      isCurrentMonth,
      isPast,
      isFuture,
      plannedOutfits: summary.plannedOutfits,
      wornOutfits: summary.wornOutfits,
      wornItems: summary.wornItems,
      washedItems: summary.washedItems,
      outfitNames,
      itemCount,
      totalLogsCount,
    });

    current.setDate(current.getDate() + 1);
  }

  const label = firstDayOfMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return {
    year,
    month,
    label,
    startDate,
    endDate,
    days,
  };
}

/**
 * Get month display label (e.g., "August 2026")
 */
export function getMonthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Navigate to previous month
 */
export function getPreviousMonth(year: number, month: number): { year: number; month: number } {
  if (month === 0) return { year: year - 1, month: 11 };
  return { year, month: month - 1 };
}

/**
 * Navigate to next month
 */
export function getNextMonth(year: number, month: number): { year: number; month: number } {
  if (month === 11) return { year: year + 1, month: 0 };
  return { year, month: month + 1 };
}

/**
 * Check if a date is in the past (before today)
 */
export function isPastDate(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d < today;
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
}

/**
 * Get outfit item IDs from planned outfits for a specific date
 */
export function getPlannedItemIds(plans: PlannedOutfit[], dateKey: string): string[] {
  return plans
    .filter(p => p.date === dateKey)
    .flatMap(p => p.itemIds);
}

/**
 * Create a planned outfit from an existing outfit
 */
export function createPlanFromOutfit(outfitId: string, dateKey: string, note?: string): PlannedOutfit {
  return {
    id: crypto.randomUUID(),
    date: dateKey,
    outfitId,
    itemIds: [],
    note,
  };
}

/**
 * Create a planned outfit from individual items
 */
export function createPlanFromItems(itemIds: string[], dateKey: string, note?: string): PlannedOutfit {
  return {
    id: crypto.randomUUID(),
    date: dateKey,
    itemIds,
    note,
  };
}

/**
 * Get week label for display (e.g., "Jan 13 - Jan 19, 2025")
 */
export function getWeekLabel(week: CalendarWeek): string {
  const start = week.startDate;
  const end = week.endDate;
  
  if (start.getMonth() === end.getMonth()) {
    return `${start.toLocaleDateString('en-US', { month: 'short' })} ${start.getDate()} - ${end.getDate()}, ${end.getFullYear()}`;
  } else {
    return `${start.toLocaleDateString('en-US', { month: 'short' })} ${start.getDate()} - ${end.toLocaleDateString('en-US', { month: 'short' })} ${end.getDate()}, ${end.getFullYear()}`;
  }
}

/**
 * Get day names for the week header (Mon-Sun)
 */
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Get full day names for the week header
 */
export const WEEKDAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];