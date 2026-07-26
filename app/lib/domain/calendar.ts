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
  outfitNames: string[];
  itemCount: number;
}

export interface DragItem {
  type: 'outfit' | 'item';
  id: string;
  dateKey?: string; // source date for moving existing plans
}

export interface CalendarDayProps {
  day: CalendarDay;
  onDrop: (dateKey: string, item: DragItem) => void;
  onClick: (dateKey: string) => void;
  outfits: Outfit[];
  items: ClothingItem[];
  isDraggingOver: boolean;
  draggedItem: DragItem | null;
}

/**
 * Get the start of week (Monday) for a given date
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
 * Get the end of week (Sunday) for a given date
 */
export function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Generate a calendar week (Mon-Sun) for a given date
 */
export function getCalendarWeek(date: Date, plans: PlannedOutfit[], outfits: Outfit[], _items?: ClothingItem[]): CalendarWeek {
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
    
    // Get planned outfits for this day
    const dayPlans = plans.filter(p => p.date === dateKey);
    
    // Get outfit names and item counts
    const outfitNames = dayPlans
      .filter(p => p.outfitId)
      .map(p => outfits.find(o => o.id === p.outfitId)?.name)
      .filter(Boolean) as string[];
    
    const itemCount = dayPlans.reduce((count, plan) => count + plan.itemIds.length, 0);

    days.push({
      date: dayDate,
      dateKey,
      dayOfWeek: dayDate.getDay(), // 0 = Sunday, 1 = Monday...
      isToday,
      isCurrentMonth: dayDate.getMonth() === date.getMonth(),
      isPast,
      isFuture,
      plannedOutfits: dayPlans,
      outfitNames,
      itemCount,
    });
  }

  return {
    startDate,
    endDate,
    days,
  };
}

/**
 * Format date as YYYY-MM-DD
 */
export function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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
    itemIds: [], // Will be populated from the outfit
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