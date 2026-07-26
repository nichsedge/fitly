import { getDB } from './RepositoryFactory';

export interface MutationRecord {
  id?: number;
  type: 'item' | 'outfit' | 'tag' | 'location' | 'plan' | 'trip';
  action: 'add' | 'update' | 'delete';
  entityId: string;
  data: unknown;
  timestamp: number;
  retries?: number;
}

export class MutationQueueRepository {
  async add(record: Omit<MutationRecord, 'id'>): Promise<void> {
    const db = await getDB();
    await db.add('mutationQueue', record);
  }

  async getAll(): Promise<MutationRecord[]> {
    const db = await getDB();
    return db.getAll('mutationQueue');
  }

  async getByType(type: MutationRecord['type']): Promise<MutationRecord[]> {
    const db = await getDB();
    const all = await db.getAll('mutationQueue');
    return all.filter(r => r.type === type);
  }

  async delete(id: number): Promise<void> {
    const db = await getDB();
    await db.delete('mutationQueue', id);
  }

  async clear(): Promise<void> {
    const db = await getDB();
    await db.clear('mutationQueue');
  }

  async markProcessed(id: number): Promise<void> {
    const db = await getDB();
    const record = await db.get('mutationQueue', id);
    if (record) {
      record.retries = (record.retries || 0) + 1;
      await db.put('mutationQueue', record);
    }
  }

  async getPending(limit = 50): Promise<MutationRecord[]> {
    const db = await getDB();
    const all = await db.getAll('mutationQueue');
    return all
      .filter(r => (r.retries || 0) < 3)
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(0, limit);
  }
}

export const mutationQueueRepository = new MutationQueueRepository();