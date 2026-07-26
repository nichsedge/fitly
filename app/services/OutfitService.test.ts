import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OutfitService, outfitService } from './OutfitService';
import { ClothingItem, Category, Outfit } from '../lib/types';

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

describe('OutfitService', () => {
  let service: OutfitService;
  let items: ClothingItem[];
  let itemsMap: Map<string, ClothingItem>;
  let outfits: Outfit[];

  beforeEach(() => {
    service = new OutfitService();
    items = [
      createMockItem({ id: '1', name: 'Blue Shirt', category: 'top', price: 50, wearLogs: [100, 200] }),
      createMockItem({ id: '2', name: 'Red Pants', category: 'bottom', price: 80, wearLogs: [50] }),
      createMockItem({ id: '3', name: 'Green Shoes', category: 'shoes', price: 120, wearLogs: [10, 20, 30] }),
      createMockItem({ id: '4', name: 'Yellow Jacket', category: 'outerwear', price: 200, wearLogs: [] }),
      createMockItem({ id: '5', name: 'White Top', category: 'top', price: 30, wearLogs: [5] }),
      createMockItem({ id: '6', name: 'Black Pants', category: 'bottom', price: 60, wearLogs: [] }),
    ];
    itemsMap = new Map(items.map(item => [item.id, item]));
    
    outfits = [
      { id: 'outfit-1', name: 'Casual Look', note: '', itemIds: ['1', '2', '3'], createdAt: 1000, wearLogs: [2000, 3000] },
      { id: 'outfit-2', name: 'Formal Look', note: 'Meeting outfit', itemIds: ['4', '2', '3'], createdAt: 2000, wearLogs: [5000] },
      { id: 'outfit-3', name: 'Summer Outfit', note: '', itemIds: ['5', '6'], createdAt: 3000, wearLogs: [] },
    ];
  });

  describe('createOutfit', () => {
    it('should create outfit with all fields', () => {
      const outfit = service.createOutfit('Test Outfit', ['1', '2', '3'], 'A note');
      
      expect(outfit.id).toBeDefined();
      expect(outfit.name).toBe('Test Outfit');
      expect(outfit.note).toBe('A note');
      expect(outfit.itemIds).toEqual(['1', '2', '3']);
      expect(outfit.createdAt).toBeDefined();
      expect(outfit.wearLogs).toEqual([]);
    });

    it('should trim outfit name', () => {
      const outfit = service.createOutfit('  Trimmed Name  ', ['1']);
      expect(outfit.name).toBe('Trimmed Name');
    });

    it('should use default name when empty', () => {
      const outfit = service.createOutfit('   ', ['1']);
      expect(outfit.name).toBe('Custom Look');
    });

    it('should use empty note by default', () => {
      const outfit = service.createOutfit('Test', ['1']);
      expect(outfit.note).toBe('');
    });
  });

  describe('getSuggestion', () => {
    it('should return one item from each main category', () => {
      const suggestion = service.getSuggestion(items);
      const categories = suggestion.map(item => item.category);
      expect(categories).toContain('top');
      expect(categories).toContain('bottom');
      expect(categories).toContain('shoes');
    });

    it('should only return ready items', () => {
      const itemsWithStatus = items.map((item, i) => 
        i === 0 ? { ...item, status: 'dirty' as const } : item
      );
      const suggestion = service.getSuggestion(itemsWithStatus);
      expect(suggestion.find(item => item.id === '1')).toBeUndefined();
    });

    it('should prefer least worn items', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0);
      const suggestion = service.getSuggestion(items);
      const top = suggestion.find(item => item.category === 'top');
      // White Top has only 1 wear (id: '5'), Blue Shirt has 2 (id: '1')
      expect(top?.id).toBe('5');
      vi.restoreAllMocks();
    });

    it('should limit pool to 3 items per category', () => {
      const manyItems = items.concat(
        createMockItem({ id: '7', name: 'Top 3', category: 'top', wearLogs: [1] }),
        createMockItem({ id: '8', name: 'Top 4', category: 'top', wearLogs: [2] }),
        createMockItem({ id: '9', name: 'Top 5', category: 'top', wearLogs: [3] }),
      );
      const suggestion = service.getSuggestion(manyItems);
      const top = suggestion.find(item => item.category === 'top');
      expect(top).toBeDefined();
    });

    it('should return empty array when no items available', () => {
      const suggestion = service.getSuggestion([]);
      expect(suggestion).toEqual([]);
    });

    it('should handle missing categories gracefully', () => {
      const itemsMissingCategories = items.filter(item => item.category !== 'shoes');
      const suggestion = service.getSuggestion(itemsMissingCategories);
      expect(suggestion.find(item => item.category === 'shoes')).toBeUndefined();
    });
  });

  describe('calculateOutfitCPW', () => {
    it('should calculate CPW correctly', () => {
      const outfit = outfits[0]; // wearLogs: [2000, 3000] = 2 wears
      const cpw = service.calculateOutfitCPW(outfit, itemsMap);
      // Total price: 50 + 80 + 120 = 250, wears: 2, CPW: 125
      expect(cpw).toBe(125);
    });

    it('should return null when no wears', () => {
      const outfit = outfits[2]; // wearLogs: []
      const cpw = service.calculateOutfitCPW(outfit, itemsMap);
      expect(cpw).toBeNull();
    });

    it('should return null when no items have price', () => {
      const itemsNoPrice = new Map(items.map(item => [item.id, { ...item, price: undefined }]));
      const outfit = outfits[0];
      const cpw = service.calculateOutfitCPW(outfit, itemsNoPrice);
      expect(cpw).toBeNull();
    });

    it('should return null when items not in map', () => {
      const emptyMap = new Map<string, ClothingItem>();
      const outfit = outfits[0];
      const cpw = service.calculateOutfitCPW(outfit, emptyMap);
      expect(cpw).toBeNull();
    });

    it('should handle partial price data', () => {
      const partialPriceMap = new Map(itemsMap);
      partialPriceMap.set('2', { ...itemsMap.get('2')!, price: undefined });
      const outfit = outfits[0];
      const cpw = service.calculateOutfitCPW(outfit, partialPriceMap);
      // Total price: 50 + 120 = 170, wears: 2, CPW: 85
      expect(cpw).toBe(85);
    });
  });

  describe('filterOutfits', () => {
    it('should return all outfits when query is empty', () => {
      const result = service.filterOutfits(outfits, '', itemsMap);
      expect(result).toHaveLength(3);
    });

    it('should filter by outfit name', () => {
      const result = service.filterOutfits(outfits, 'Casual', itemsMap);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Casual Look');
    });

    it('should filter by outfit note', () => {
      const result = service.filterOutfits(outfits, 'Meeting', itemsMap);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Formal Look');
    });

    it('should filter by item name', () => {
      const result = service.filterOutfits(outfits, 'Blue', itemsMap);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Casual Look');
    });

    it('should filter by item category', () => {
      const result = service.filterOutfits(outfits, 'outerwear', itemsMap);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Formal Look');
    });

    it('should be case insensitive', () => {
      const result = service.filterOutfits(outfits, 'casual', itemsMap);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Casual Look');
    });

    it('should return empty array when no matches', () => {
      const result = service.filterOutfits(outfits, 'Nonexistent', itemsMap);
      expect(result).toHaveLength(0);
    });
  });

  describe('exported instance', () => {
    it('should export a singleton instance', () => {
      expect(outfitService).toBeInstanceOf(OutfitService);
    });
  });
});