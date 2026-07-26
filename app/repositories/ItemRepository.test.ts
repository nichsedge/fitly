import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ItemRepository, itemRepository, migrateItem } from './ItemRepository';
import { ClothingItem, Category } from '../lib/types';

// Use vi.hoisted to avoid hoisting issues with vi.mock
const { mockDB } = vi.hoisted(() => ({
  mockDB: {
    getAll: vi.fn(),
    get: vi.fn(),
    getAllFromIndex: vi.fn(),
    add: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    transaction: vi.fn(),
  }
}));

vi.mock('./RepositoryFactory', () => ({
  getDB: vi.fn().mockResolvedValue(mockDB),
}));

describe('ItemRepository', () => {
  let repository: ItemRepository;

  beforeEach(() => {
    repository = new ItemRepository();
    vi.clearAllMocks();
  });

  describe('migrateItem', () => {
    it('should migrate old imageData to images array', () => {
      const raw: Record<string, unknown> = { id: '1', imageData: 'data:image/png;base64,abc', name: 'Test' };
      const migrated = migrateItem(raw);
      expect(migrated.images).toEqual(['data:image/png;base64,abc']);
      expect((migrated as Record<string, unknown>).imageData).toBeUndefined();
    });

    it('should handle missing imageData', () => {
      const raw: Record<string, unknown> = { id: '1', name: 'Test' };
      const migrated = migrateItem(raw);
      expect(migrated.images).toEqual([]);
    });

    it('should migrate lastWornAt to wearLogs', () => {
      const raw: Record<string, unknown> = { id: '1', lastWornAt: 1000, name: 'Test' };
      const migrated = migrateItem(raw);
      expect(migrated.wearLogs).toEqual([1000]);
    });

    it('should set default status', () => {
      const raw: Record<string, unknown> = { id: '1', name: 'Test' };
      const migrated = migrateItem(raw);
      expect(migrated.status).toBe('ready');
    });

    it('should set default brand', () => {
      const raw: Record<string, unknown> = { id: '1', name: 'Test', brand: undefined };
      const migrated = migrateItem(raw);
      expect(migrated.brand).toBe('');
    });

    it('should set default arrays', () => {
      const raw: Record<string, unknown> = { id: '1', name: 'Test' };
      const migrated = migrateItem(raw);
      expect(migrated.wearLogs).toEqual([]);
      expect(migrated.images).toEqual([]);
      expect(migrated.tags).toEqual([]);
    });

    it('should set default condition', () => {
      const raw: Record<string, unknown> = { id: '1', name: 'Test', condition: undefined };
      const migrated = migrateItem(raw);
      expect(migrated.condition).toBe('good');
    });

    it('should set default lastWashedAt', () => {
      const raw: Record<string, unknown> = { id: '1', name: 'Test', lastWashedAt: undefined };
      const migrated = migrateItem(raw);
      expect(migrated.lastWashedAt).toBe(0);
    });

    it('should set default locationId', () => {
      const raw: Record<string, unknown> = { id: '1', name: 'Test' };
      const migrated = migrateItem(raw);
      expect(migrated.locationId).toBe('loc-home');
    });

    it('should return null/undefined as is', () => {
      expect(migrateItem(null)).toBeNull();
      expect(migrateItem(undefined)).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return all items with migration', async () => {
      const rawItems = [
        { id: '1', name: 'Item 1', category: 'top' as Category },
        { id: '2', name: 'Item 2', category: 'bottom' as Category },
      ];
      mockDB.getAll.mockResolvedValue(rawItems);

      const result = await repository.getAll();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
      expect(mockDB.getAll).toHaveBeenCalledWith('items');
    });

    it('should return empty array when no items', async () => {
      mockDB.getAll.mockResolvedValue([]);
      const result = await repository.getAll();
      expect(result).toEqual([]);
    });
  });

  describe('getById', () => {
    it('should return migrated item when found', async () => {
      const rawItem = { id: '1', name: 'Item 1', category: 'top' as Category };
      mockDB.get.mockResolvedValue(rawItem);

      const result = await repository.getById('1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('1');
      expect(mockDB.get).toHaveBeenCalledWith('items', '1');
    });

    it('should return undefined when not found', async () => {
      mockDB.get.mockResolvedValue(undefined);
      const result = await repository.getById('nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('getByCategory', () => {
    it('should return items filtered by category', async () => {
      const rawItems = [
        { id: '1', name: 'Item 1', category: 'top' as Category },
        { id: '2', name: 'Item 2', category: 'top' as Category },
      ];
      mockDB.getAllFromIndex.mockResolvedValue(rawItems);

      const result = await repository.getByCategory('top');

      expect(result).toHaveLength(2);
      expect(mockDB.getAllFromIndex).toHaveBeenCalledWith('items', 'byCategory', 'top');
    });
  });

  describe('getByLocation', () => {
    it('should return items filtered by location', async () => {
      const items = [
        { id: '1', name: 'Item 1', locationId: 'loc-home' },
        { id: '2', name: 'Item 2', locationId: 'loc-office' },
      ];
      mockDB.getAll.mockResolvedValue(items);

      const result = await repository.getByLocation('loc-office');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });

    it('should use default location when not set', async () => {
      const items = [{ id: '1', name: 'Item 1' }]; // no locationId
      mockDB.getAll.mockResolvedValue(items);

      const result = await repository.getByLocation('loc-home');

      expect(result).toHaveLength(1);
    });
  });

  describe('add', () => {
    it('should add item to database', async () => {
      const item = { id: '1', name: 'New Item', category: 'top' as Category } as ClothingItem;
      await repository.add(item);
      expect(mockDB.add).toHaveBeenCalledWith('items', item);
    });

    it('should throw on quota exceeded', async () => {
      const item = { id: '1', name: 'New Item', category: 'top' as Category } as ClothingItem;
      mockDB.add.mockRejectedValue({ name: 'QuotaExceededError' });
      
      await expect(repository.add(item)).rejects.toThrow('Device storage limit reached');
    });
  });

  describe('update', () => {
    it('should update item in database', async () => {
      const item = { id: '1', name: 'Updated Item', category: 'top' as Category } as ClothingItem;
      await repository.update(item);
      expect(mockDB.put).toHaveBeenCalledWith('items', item);
    });

    it('should throw on quota exceeded', async () => {
      const item = { id: '1', name: 'Updated Item', category: 'top' as Category } as ClothingItem;
      mockDB.put.mockRejectedValue({ name: 'QuotaExceededError' });
      
      await expect(repository.update(item)).rejects.toThrow('Device storage limit reached');
    });
  });

  describe('delete', () => {
    it('should delete item from database', async () => {
      await repository.delete('1');
      expect(mockDB.delete).toHaveBeenCalledWith('items', '1');
    });
  });

  describe('bulkUpdate', () => {
    it('should update multiple items in transaction', async () => {
      const items = [
        { id: '1', name: 'Item 1', category: 'top' as Category } as ClothingItem,
        { id: '2', name: 'Item 2', category: 'bottom' as Category } as ClothingItem,
      ];
      
      const mockTx = {
        store: { put: vi.fn() },
        done: Promise.resolve(),
      };
      mockDB.transaction.mockReturnValue(mockTx);

      await repository.bulkUpdate(items);
      
      expect(mockDB.transaction).toHaveBeenCalledWith('items', 'readwrite');
      expect(mockTx.store.put).toHaveBeenCalledTimes(2);
    });
  });

  describe('count', () => {
    it('should return item count', async () => {
      mockDB.count.mockResolvedValue(5);
      const count = await repository.count();
      expect(count).toBe(5);
    });
  });

  describe('exported instance', () => {
    it('should export a singleton instance', () => {
      expect(itemRepository).toBeInstanceOf(ItemRepository);
    });
  });
});