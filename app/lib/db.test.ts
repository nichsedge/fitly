import { describe, it, expect, beforeEach } from 'vitest';
import { normalizeEmbeddedImages } from './db';
import { getDB } from '../repositories/RepositoryFactory';
import { imageRepository } from '../repositories/ImageRepository';
import type { ClothingItem } from './types';

// A tiny valid 1x1 PNG data URL (as old versions stored inline in items).
const PNG_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

function makeItem(id: string, images: string[]): ClothingItem {
  return {
    id,
    name: 'Item',
    category: 'top',
    color: '#1a1a1a',
    tags: [],
    images,
    createdAt: Date.now(),
    status: 'ready',
  };
}

describe('normalizeEmbeddedImages', () => {
  beforeEach(async () => {
    const db = await getDB();
    await db.clear('items');
    await db.clear('images');
  });

  it('is a no-op when no items contain embedded base64 images', async () => {
    const db = await getDB();
    await db.put('items', makeItem('a', ['img-1']));
    await normalizeEmbeddedImages();
    const items = await db.getAll('items');
    expect(items[0].images).toEqual(['img-1']);
  });

  it('migrates embedded base64 images into the binary images store', async () => {
    const db = await getDB();
    await db.put('items', makeItem('a', [PNG_DATA_URL]));

    await normalizeEmbeddedImages();

    const items = await db.getAll('items');
    const blobs = await db.getAll('images');
    expect(items[0].images).toHaveLength(1);
    expect(items[0].images[0]).toMatch(/^img-/);
    expect(blobs).toHaveLength(1);
    expect(blobs[0].id).toBe(items[0].images[0]);
    // fake-indexeddb may not preserve Blob identity; just confirm a record
    // with blob payload was persisted alongside the item reference.
    expect(blobs[0].blob).toBeTruthy();
    // The item record no longer carries the raw base64 payload.
    expect(JSON.stringify(items[0])).not.toContain('base64');
  });

  it('preserves existing references while migrating embedded images', async () => {
    const db = await getDB();
    await imageRepository.add('img-existing', new Blob(['x'], { type: 'image/jpeg' }));
    await db.put('items', makeItem('a', ['img-existing', PNG_DATA_URL]));

    await normalizeEmbeddedImages();

    const items = await db.getAll('items');
    expect(items[0].images[0]).toBe('img-existing');
    expect(items[0].images[1]).toMatch(/^img-/);
    expect(items[0].images[1]).not.toBe('img-existing');
  });

  it('is idempotent across repeated runs', async () => {
    const db = await getDB();
    await db.put('items', makeItem('a', [PNG_DATA_URL]));

    await normalizeEmbeddedImages();
    await normalizeEmbeddedImages();

    const blobs = await db.getAll('images');
    expect(blobs).toHaveLength(1);
    const items = await db.getAll('items');
    expect(items[0].images[0]).toMatch(/^img-/);
  });
});
