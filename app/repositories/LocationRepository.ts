import { getDB } from './RepositoryFactory';
import { WardrobeLocation, DEFAULT_LOCATIONS } from '../lib/types';

export class LocationRepository {
  async getAll(): Promise<WardrobeLocation[]> {
    const db = await getDB();
    return db.getAll('locations');
  }

  async add(location: WardrobeLocation): Promise<void> {
    const db = await getDB();
    await db.add('locations', location);
  }

  async update(location: WardrobeLocation): Promise<void> {
    const db = await getDB();
    await db.put('locations', location);
  }

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('locations', id);
  }

  async seedIfEmpty(): Promise<void> {
    const db = await getDB();
    const existing = await db.getAll('locations');
    if (existing.length === 0) {
      const tx = db.transaction('locations', 'readwrite');
      const store = tx.objectStore('locations');
      for (const loc of DEFAULT_LOCATIONS) {
        await store.add(loc);
      }
      await tx.done;
    }
  }
}

export const locationRepository = new LocationRepository();
