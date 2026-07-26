import { describe, it, expect, beforeEach } from 'vitest';
import { LaundryService, laundryService } from './LaundryService';
import { ClothingItem, Category } from '../lib/types';

const createMockItem = (overrides: Partial<ClothingItem> = {}): ClothingItem => ({
  id: 'item-1',
  name: 'Test Shirt',
  category: 'top' as Category,
  color: '#ff0000',
  brand: 'Test Brand',
  material: 'cotton',
  tags: ['casual'],
  status: 'ready',
  condition: 'good',
  images: [],
  wearLogs: [Date.now() - 1000000, Date.now() - 500000],
  washLogs: [Date.now() - 2000000],
  lastWashedAt: Date.now() - 2000000,
  price: 50,
  createdAt: Date.now() - 5000000,
  locationId: 'loc-home',
  ...overrides,
});

describe('LaundryService', () => {
  let service: LaundryService;
  let items: ClothingItem[];

  beforeEach(() => {
    service = new LaundryService();
    items = [
      createMockItem({ 
        id: '1', 
        name: 'Blue Shirt', 
        category: 'top', 
        wearLogs: [100, 200, 300], 
        lastWashedAt: 50,
        washLogs: [50],
      }),
      createMockItem({ 
        id: '2', 
        name: 'Red Pants', 
        category: 'bottom', 
        wearLogs: [10, 20], 
        lastWashedAt: 15,
        washLogs: [15],
      }),
      createMockItem({ 
        id: '3', 
        name: 'Green Shoes', 
        category: 'shoes', 
        wearLogs: [5, 10, 15, 20], 
        lastWashedAt: 0,
        washLogs: [0],
      }),
      createMockItem({ 
        id: '4', 
        name: 'Yellow Jacket', 
        category: 'outerwear', 
        wearLogs: [], 
        lastWashedAt: 0,
        washLogs: [],
      }),
      createMockItem({ 
        id: '5', 
        name: 'White Socks', 
        category: 'underwear', 
        wearLogs: [1, 2, 3, 4, 5], 
        lastWashedAt: 0,
        washLogs: [0],
      }),
    ];
  });

  describe('getWornItems', () => {
    it('should return items worn since last wash', () => {
      const result = service.getWornItems(items);
      expect(result.length).toBe(3); // top, bottom, underwear
      expect(result[0].item.name).toBe('White Socks'); // 5 wears since wash
      expect(result[1].item.name).toBe('Blue Shirt'); // 3 wears since wash
      expect(result[2].item.name).toBe('Red Pants'); // 2 wears since wash
    });

    it('should filter by selected categories', () => {
      const result = service.getWornItems(items, ['top'], false);
      expect(result.length).toBe(1);
      expect(result[0].item.name).toBe('Blue Shirt');
    });

    it('should return all worn items when showAll is true', () => {
      const result = service.getWornItems(items, ['top', 'bottom', 'underwear', 'outerwear'], true);
      expect(result.length).toBe(4); // includes shoes when showAll=true
      expect(result.some(r => r.item.name === 'Green Shoes')).toBe(true);
    });

    it('should sort by wears since wash descending', () => {
      const result = service.getWornItems(items);
      expect(result[0].wearsSinceWash).toBeGreaterThanOrEqual(result[1].wearsSinceWash);
      expect(result[1].wearsSinceWash).toBeGreaterThanOrEqual(result[2].wearsSinceWash);
    });

    it('should return empty array when no items worn since wash', () => {
      const cleanItems = items.map(item => ({ 
        ...item, 
        wearLogs: item.wearLogs?.map(log => log - 1000) || [],
        lastWashedAt: Date.now(),
      }));
      const result = service.getWornItems(cleanItems);
      expect(result).toHaveLength(0);
    });
  });

  describe('getWashHistory', () => {
    it('should group wash logs by day', () => {
      const today = new Date();
      const dayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      
      const itemsWithWashes = items.map(item => ({
        ...item,
        washLogs: [today.getTime()],
        lastWashedAt: today.getTime(),
      }));
      
      const history = service.getWashHistory(itemsWithWashes);
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].key).toBe(dayKey);
      expect(history[0].items.length).toBe(itemsWithWashes.length);
    });

    it('should sort history by date descending', () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-01-02');
      
      const itemsWithWashes = [
        createMockItem({ washLogs: [date1.getTime()], lastWashedAt: date1.getTime() }),
        createMockItem({ washLogs: [date2.getTime()], lastWashedAt: date2.getTime() }),
      ];
      
      const history = service.getWashHistory(itemsWithWashes);
      expect(history[0].date.getTime()).toBeGreaterThan(history[1].date.getTime());
    });

    it('should use lastWashedAt when washLogs is empty', () => {
      const date = new Date('2024-01-15');
      const itemsWithLegacy = items.map(item => ({
        ...item,
        washLogs: [],
        lastWashedAt: date.getTime(),
      }));
      
      const history = service.getWashHistory(itemsWithLegacy);
      expect(history.length).toBe(1);
      expect(history[0].date.getTime()).toBe(date.getTime());
    });

    it('should not duplicate items in same day', () => {
      const date = new Date('2024-01-01');
      const itemsSameDay = [
        createMockItem({ id: '1', washLogs: [date.getTime(), date.getTime() + 1000], lastWashedAt: date.getTime() }),
        createMockItem({ id: '2', washLogs: [date.getTime()], lastWashedAt: date.getTime() }),
      ];
      
      const history = service.getWashHistory(itemsSameDay);
      expect(history[0].items.length).toBe(2);
    });
  });

  describe('createWashedItemUpdate', () => {
    it('should update lastWashedAt and add to washLogs', () => {
      const item = createMockItem({ lastWashedAt: 100, washLogs: [100] });
      const timestamp = Date.now();
      const updated = service.createWashedItemUpdate(item, timestamp);
      
      expect(updated.lastWashedAt).toBe(timestamp);
      expect(updated.washLogs).toContain(timestamp);
      expect(updated.washLogs).toContain(100);
      expect(updated.status).toBe('ready');
    });

    it('should initialize washLogs if not present', () => {
      const item = createMockItem({ washLogs: [], lastWashedAt: 0 });
      const timestamp = Date.now();
      const updated = service.createWashedItemUpdate(item, timestamp);
      
      expect(updated.washLogs).toEqual([timestamp]);
    });

    it('should migrate from lastWashedAt if washLogs empty', () => {
      const item = createMockItem({ washLogs: [], lastWashedAt: 100 });
      const timestamp = Date.now();
      const updated = service.createWashedItemUpdate(item, timestamp);
      
      expect(updated.washLogs).toContain(100);
      expect(updated.washLogs).toContain(timestamp);
    });
  });

  describe('getDayKey', () => {
    it('should format date as YYYY-MM-DD', () => {
      const date = new Date('2024-01-15T10:30:00Z').getTime();
      const key = service.getDayKey(date);
      expect(key).toBe('2024-01-15');
    });
  });

  describe('exported instance', () => {
    it('should export a singleton instance', () => {
      expect(laundryService).toBeInstanceOf(LaundryService);
    });
  });
});