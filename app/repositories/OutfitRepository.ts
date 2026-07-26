import { getDB } from './RepositoryFactory';
import { Outfit } from '../lib/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function migrateOutfit(raw: any): Outfit {
  if (!raw) return raw;
  if (raw.lastWornAt && !raw.wearLogs) {
    raw.wearLogs = [raw.lastWornAt];
  }
  if (!raw.wearLogs) raw.wearLogs = [];
  if (!raw.itemIds) raw.itemIds = [];
  return raw as Outfit;
}

export class OutfitRepository {
  async getAll(): Promise<Outfit[]> {
    const db = await getDB();
    const rawOutfits = await db.getAll('outfits');
    return rawOutfits.map(migrateOutfit);
  }

  async getById(id: string): Promise<Outfit | undefined> {
    const db = await getDB();
    const rawOutfit = await db.get('outfits', id);
    return rawOutfit ? migrateOutfit(rawOutfit) : undefined;
  }

  async add(outfit: Outfit): Promise<void> {
    try {
      const db = await getDB();
      await db.add('outfits', outfit);
    } catch (err: unknown) {
      if ((err as { name?: string })?.name === 'QuotaExceededError') {
        throw new Error('Device storage limit reached.');
      }
      throw err;
    }
  }

  async update(outfit: Outfit): Promise<void> {
    try {
      const db = await getDB();
      await db.put('outfits', outfit);
    } catch (err: unknown) {
      if ((err as { name?: string })?.name === 'QuotaExceededError') {
        throw new Error('Device storage limit reached.');
      }
      throw err;
    }
  }

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('outfits', id);
  }

  async count(): Promise<number> {
    const db = await getDB();
    return db.count('outfits');
  }
}

export const outfitRepository = new OutfitRepository();
