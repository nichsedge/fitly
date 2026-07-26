import { getDB } from './RepositoryFactory';
import { PlannedOutfit } from '../lib/types';

export class PlanRepository {
  async getAll(): Promise<PlannedOutfit[]> {
    const db = await getDB();
    return db.getAll('plans');
  }

  async getById(id: string): Promise<PlannedOutfit | undefined> {
    const db = await getDB();
    return db.get('plans', id);
  }

  async getByDate(date: string): Promise<PlannedOutfit[]> {
    const db = await getDB();
    return db.getAllFromIndex('plans', 'byDate', date);
  }

  async add(plan: PlannedOutfit): Promise<void> {
    const db = await getDB();
    await db.add('plans', plan);
  }

  async update(plan: PlannedOutfit): Promise<void> {
    const db = await getDB();
    await db.put('plans', plan);
  }

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('plans', id);
  }
}

export const planRepository = new PlanRepository();
