import { getDB } from './RepositoryFactory';
import { Trip } from '../lib/types';

export class TripRepository {
  async getAll(): Promise<Trip[]> {
    const db = await getDB();
    return db.getAll('trips');
  }

  async getById(id: string): Promise<Trip | undefined> {
    const db = await getDB();
    return db.get('trips', id);
  }

  async add(trip: Trip): Promise<void> {
    const db = await getDB();
    await db.add('trips', trip);
  }

  async update(trip: Trip): Promise<void> {
    const db = await getDB();
    await db.put('trips', trip);
  }

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('trips', id);
  }
}

export const tripRepository = new TripRepository();
