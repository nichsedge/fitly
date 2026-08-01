import { getDB } from './RepositoryFactory';
import { ClothingItem } from '../lib/types';
import { imageRepository } from './ImageRepository';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function migrateItem(raw: any): ClothingItem {
  if (!raw) return raw;
  
  if (typeof raw.imageData === 'string') {
    raw.images = raw.imageData ? [raw.imageData] : [];
    delete raw.imageData;
  }
  if (raw.lastWornAt && !raw.wearLogs) {
    raw.wearLogs = [raw.lastWornAt];
  }
  if (!raw.status) {
    raw.status = 'ready';
  }
  if (raw.brand === undefined) raw.brand = '';
  if (!raw.wearLogs) raw.wearLogs = [];
  if (!raw.images) raw.images = [];
  if (!raw.tags) raw.tags = [];
  
  if (raw.condition === undefined) raw.condition = 'good';
  if (raw.material === undefined) raw.material = '';
  if (raw.careInstructions === undefined) raw.careInstructions = '';
  if (raw.lastWashedAt === undefined) raw.lastWashedAt = 0;
  if (!raw.locationId) raw.locationId = 'loc-home';
  
  return raw as ClothingItem;
}

export class ItemRepository {
  async getAll(): Promise<ClothingItem[]> {
    const db = await getDB();
    const rawItems = await db.getAll('items');
    return rawItems.map(migrateItem);
  }

  async getById(id: string): Promise<ClothingItem | undefined> {
    const db = await getDB();
    const rawItem = await db.get('items', id);
    return rawItem ? migrateItem(rawItem) : undefined;
  }

  async getByCategory(category: string): Promise<ClothingItem[]> {
    const db = await getDB();
    const rawItems = await db.getAllFromIndex('items', 'byCategory', category);
    return rawItems.map(migrateItem);
  }

  async getByLocation(locationId: string): Promise<ClothingItem[]> {
    const all = await this.getAll();
    return all.filter(i => (i.locationId || 'loc-home') === locationId);
  }

  async add(item: ClothingItem): Promise<void> {
    try {
      const db = await getDB();
      await db.add('items', item);
    } catch (err: unknown) {
      if ((err as { name?: string })?.name === 'QuotaExceededError') {
        throw new Error('Device storage limit reached. Please clear old items or photos in Settings.');
      }
      throw err;
    }
  }

  async update(item: ClothingItem): Promise<void> {
    try {
      const db = await getDB();
      await db.put('items', item);
    } catch (err: unknown) {
      if ((err as { name?: string })?.name === 'QuotaExceededError') {
        throw new Error('Device storage limit reached. Please clear old items or photos in Settings.');
      }
      throw err;
    }
  }

  async delete(id: string): Promise<void> {
    const db = await getDB();
    // Clean up image blobs referenced by this item to avoid orphaned storage.
    const item = (await db.get('items', id)) as ClothingItem | undefined;
    if (item && Array.isArray(item.images)) {
      const refs = item.images.filter((ref) => typeof ref === 'string' && ref.startsWith('img-'));
      if (refs.length > 0) {
        await imageRepository.deleteMultiple(refs);
      }
    }
    await db.delete('items', id);
  }

  async bulkUpdate(items: ClothingItem[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction('items', 'readwrite');
    await Promise.all(items.map(item => tx.store.put(item)));
    await tx.done;
  }

  async count(): Promise<number> {
    const db = await getDB();
    return db.count('items');
  }
}

export const itemRepository = new ItemRepository();