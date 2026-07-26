import { getDB } from './RepositoryFactory';
import { ClothingItem } from '../lib/types';
import { mutationQueueRepository } from './MutationQueueRepository';

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

async function queueMutation(type: 'item' | 'outfit' | 'tag' | 'location' | 'plan' | 'trip', action: 'add' | 'update' | 'delete', entityId: string, data: unknown) {
  try {
    await mutationQueueRepository.add({
      type,
      action,
      entityId,
      data,
      timestamp: Date.now(),
    });
  } catch (err: unknown) {
    if ((err as { name?: string })?.name !== 'QuotaExceededError') {
      console.error('Failed to queue mutation:', err);
    }
  }
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
      await queueMutation('item', 'add', item.id, item);
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
      await queueMutation('item', 'update', item.id, item);
    } catch (err: unknown) {
      if ((err as { name?: string })?.name === 'QuotaExceededError') {
        throw new Error('Device storage limit reached. Please clear old items or photos in Settings.');
      }
      throw err;
    }
  }

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('items', id);
    await queueMutation('item', 'delete', id, { id });
  }

  async bulkUpdate(items: ClothingItem[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction('items', 'readwrite');
    await Promise.all(items.map(item => tx.store.put(item)));
    await tx.done;
    await Promise.all(items.map(item => queueMutation('item', 'update', item.id, item)));
  }

  async count(): Promise<number> {
    const db = await getDB();
    return db.count('items');
  }
}

export const itemRepository = new ItemRepository();