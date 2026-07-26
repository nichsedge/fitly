import { describe, it, expect, beforeEach } from 'vitest';
import { ItemService, itemService } from './ItemService';
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

describe('ItemService', () => {
  let service: ItemService;
  let items: ClothingItem[];

  beforeEach(() => {
    service = new ItemService();
    items = [
      createMockItem({ id: '1', name: 'Blue Shirt', category: 'top', price: 50, wearLogs: [1, 2, 3], washLogs: [0], lastWashedAt: 0, createdAt: 1000 }),
      createMockItem({ id: '2', name: 'Red Pants', category: 'bottom', price: 80, wearLogs: [1], washLogs: [0], lastWashedAt: 0, createdAt: 2000 }),
      createMockItem({ id: '3', name: 'Green Shoes', category: 'shoes', price: 120, wearLogs: [1, 2, 3, 4, 5], washLogs: [0], lastWashedAt: 0, createdAt: 3000 }),
      createMockItem({ id: '4', name: 'Yellow Jacket', category: 'outerwear', price: 200, wearLogs: [], washLogs: [], lastWashedAt: 0, createdAt: 4000 }),
    ];
  });

  describe('filterItems', () => {
    it('should filter by category', () => {
      const result = service.filterItems(items, { category: 'top' });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Blue Shirt');
    });

    it('should filter by tag', () => {
      const result = service.filterItems(items, { tag: 'casual' });
      expect(result).toHaveLength(4);
    });

    it('should filter by status', () => {
      const itemsWithStatus = items.map((item, i) => 
        i === 0 ? { ...item, status: 'dirty' as const } : item
      );
      const result = service.filterItems(itemsWithStatus, { status: 'dirty' });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Blue Shirt');
    });

    it('should filter by search query (name)', () => {
      const result = service.filterItems(items, { searchQuery: 'Blue' });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Blue Shirt');
    });

    it('should filter by search query (brand)', () => {
      const result = service.filterItems(items, { searchQuery: 'Test Brand' });
      expect(result).toHaveLength(4);
    });

    it('should filter by search query (category)', () => {
      const result = service.filterItems(items, { searchQuery: 'top' });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Blue Shirt');
    });

    it('should filter by location', () => {
      const itemsWithLocation = items.map((item, i) => 
        i === 0 ? { ...item, locationId: 'loc-office' } : item
      );
      const result = service.filterItems(itemsWithLocation, { locationId: 'loc-office' });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Blue Shirt');
    });

    it('should combine multiple filters', () => {
      const result = service.filterItems(items, { category: 'top', searchQuery: 'Shirt' });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Blue Shirt');
    });

    it('should return all items when filters are "all"', () => {
      const result = service.filterItems(items, { category: 'all', tag: 'all', status: 'all', condition: 'all' });
      expect(result).toHaveLength(4);
    });

    it('should return empty array when no matches', () => {
      const result = service.filterItems(items, { searchQuery: 'Nonexistent' });
      expect(result).toHaveLength(0);
    });
  });

  describe('sortItems', () => {
    it('should sort by newest first', () => {
      const result = service.sortItems(items, 'newest');
      expect(result[0].name).toBe('Yellow Jacket');
      expect(result[3].name).toBe('Blue Shirt');
    });

    it('should sort by oldest first', () => {
      const result = service.sortItems(items, 'oldest');
      expect(result[0].name).toBe('Blue Shirt');
      expect(result[3].name).toBe('Yellow Jacket');
    });

    it('should sort by most worn', () => {
      const result = service.sortItems(items, 'most-worn');
      expect(result[0].name).toBe('Green Shoes');
      expect(result[1].name).toBe('Blue Shirt');
      expect(result[2].name).toBe('Red Pants');
      expect(result[3].name).toBe('Yellow Jacket');
    });

    it('should sort by least worn', () => {
      const result = service.sortItems(items, 'least-worn');
      expect(result[0].name).toBe('Yellow Jacket');
      expect(result[1].name).toBe('Red Pants');
      expect(result[2].name).toBe('Blue Shirt');
      expect(result[3].name).toBe('Green Shoes');
    });

    it('should sort by CPW low to high', () => {
      const result = service.sortItems(items, 'cpw-low');
      expect(result[0].name).toBe('Blue Shirt');
      expect(result[1].name).toBe('Green Shoes');
      expect(result[2].name).toBe('Red Pants');
      expect(result[3].name).toBe('Yellow Jacket');
    });

    it('should sort by CPW high to low', () => {
      const result = service.sortItems(items, 'cpw-high');
      expect(result[0].name).toBe('Red Pants');
      expect(result[1].name).toBe('Green Shoes');
      expect(result[2].name).toBe('Blue Shirt');
      expect(result[3].name).toBe('Yellow Jacket');
    });

    it('should sort by price high to low', () => {
      const result = service.sortItems(items, 'price-high');
      expect(result[0].name).toBe('Yellow Jacket');
      expect(result[1].name).toBe('Green Shoes');
      expect(result[2].name).toBe('Red Pants');
      expect(result[3].name).toBe('Blue Shirt');
    });

    it('should sort by price low to high', () => {
      const result = service.sortItems(items, 'price-low');
      expect(result[0].name).toBe('Blue Shirt');
      expect(result[1].name).toBe('Red Pants');
      expect(result[2].name).toBe('Green Shoes');
      expect(result[3].name).toBe('Yellow Jacket');
    });
  });

  describe('calculateCPW', () => {
    it('should calculate CPW correctly', () => {
      const item = createMockItem({ price: 100, wearLogs: [1, 2, 3, 4, 5] });
      expect(service.calculateCPW(item)).toBe(20);
    });

    it('should return null when price is 0', () => {
      const item = createMockItem({ price: 0, wearLogs: [1, 2] });
      expect(service.calculateCPW(item)).toBeNull();
    });

    it('should return null when price is undefined', () => {
      const item = createMockItem({ price: undefined, wearLogs: [1, 2] });
      expect(service.calculateCPW(item)).toBeNull();
    });

    it('should return null when wear count is 0', () => {
      const item = createMockItem({ price: 100, wearLogs: [] });
      expect(service.calculateCPW(item)).toBeNull();
    });
  });

  describe('getWornItemsSinceWash', () => {
    it('should return items worn since last wash', () => {
      const itemsWithWashes = items.map((item, i) => {
        if (i === 0) return { ...item, wearLogs: [10, 20, 30], lastWashedAt: 15 };
        if (i === 1) return { ...item, wearLogs: [5, 10], lastWashedAt: 20 };
        return item;
      });
      const result = service.getWornItemsSinceWash(itemsWithWashes);
      // items[0]: wears after 15 = 2 (20, 30)
      // items[2]: wears after 0 = 5 (1, 2, 3, 4, 5)
      expect(result).toHaveLength(2);
      expect(result[0].wearsSinceWash).toBe(5); // items[2] has 5 wears since wash
      expect(result[1].wearsSinceWash).toBe(2); // items[0] has 2 wears since wash
    });

    it('should sort by wears since wash descending', () => {
      const itemsWithWashes = [
        createMockItem({ wearLogs: [10, 20, 30], lastWashedAt: 15 }),
        createMockItem({ wearLogs: [5, 10, 15, 20], lastWashedAt: 0 }),
      ];
      const result = service.getWornItemsSinceWash(itemsWithWashes);
      expect(result[0].wearsSinceWash).toBe(4);
      expect(result[1].wearsSinceWash).toBe(2);
    });

    it('should return empty array when no items worn since wash', () => {
      const itemsClean = items.map(item => ({ ...item, wearLogs: [1, 2], lastWashedAt: 10 }));
      const result = service.getWornItemsSinceWash(itemsClean);
      expect(result).toHaveLength(0);
    });
  });

  describe('getCategoryCounts', () => {
    it('should count items by category', () => {
      const counts = service.getCategoryCounts(items);
      expect(counts.top).toBe(1);
      expect(counts.bottom).toBe(1);
      expect(counts.shoes).toBe(1);
      expect(counts.outerwear).toBe(1);
    });
  });

  describe('getTotalValue', () => {
    it('should sum prices of all items', () => {
      const total = service.getTotalValue(items);
      expect(total).toBe(450);
    });

    it('should handle items without price', () => {
      const itemsNoPrice = items.map(item => ({ ...item, price: undefined }));
      const total = service.getTotalValue(itemsNoPrice);
      expect(total).toBe(0);
    });
  });

  describe('getWearStats', () => {
    it('should calculate total wears and average CPW', () => {
      const stats = service.getWearStats(items);
      expect(stats.totalWears).toBe(9);
      expect(stats.avgCPW).toBeCloseTo(40.22, 1);
    });

    it('should handle empty array', () => {
      const stats = service.getWearStats([]);
      expect(stats.totalWears).toBe(0);
      expect(stats.avgCPW).toBe(0);
    });
  });

  describe('exported instance', () => {
    it('should export a singleton instance', () => {
      expect(itemService).toBeInstanceOf(ItemService);
    });
  });
});