import { getDB } from './RepositoryFactory';

export class ImageRepository {
  async add(id: string, blob: Blob): Promise<void> {
    const db = await getDB();
    await db.put('images', { id, blob, createdAt: Date.now() });
  }

  async get(id: string): Promise<Blob | undefined> {
    const db = await getDB();
    const record = await db.get('images', id);
    return record?.blob;
  }

  async getMultiple(ids: string[]): Promise<Map<string, Blob>> {
    const db = await getDB();
    const tx = db.transaction('images', 'readonly');
    const store = tx.objectStore('images');
    const results = await Promise.all(ids.map(id => store.get(id)));
    await tx.done;
    
    const map = new Map<string, Blob>();
    results.forEach((record, idx) => {
      if (record?.blob) {
        map.set(ids[idx], record.blob);
      }
    });
    return map;
  }

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('images', id);
  }

  async deleteMultiple(ids: string[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction('images', 'readwrite');
    const store = tx.objectStore('images');
    await Promise.all(ids.map(id => store.delete(id)));
    await tx.done;
  }

  async clear(): Promise<void> {
    const db = await getDB();
    await db.clear('images');
  }
}

export const imageRepository = new ImageRepository();
