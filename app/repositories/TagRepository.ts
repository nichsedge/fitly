import { getDB } from './RepositoryFactory';
import { CustomTag, DEFAULT_TAG_NAMES } from '../lib/types';
import { uuidv4 } from '../lib/id';

export class TagRepository {
  async getAll(): Promise<CustomTag[]> {
    const db = await getDB();
    return db.getAll('tags');
  }

  async add(tag: CustomTag): Promise<void> {
    const db = await getDB();
    await db.add('tags', tag);
  }

  async update(tag: CustomTag): Promise<void> {
    const db = await getDB();
    await db.put('tags', tag);
  }

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('tags', id);
  }

  async seedIfEmpty(): Promise<void> {
    const db = await getDB();
    const existing = await db.getAll('tags');
    if (existing.length === 0) {
      const tx = db.transaction('tags', 'readwrite');
      const store = tx.objectStore('tags');
      for (const name of DEFAULT_TAG_NAMES) {
        await store.add({ id: uuidv4(), label: name });
      }
      await tx.done;
    }
  }
}

export const tagRepository = new TagRepository();
