import { ClothingItem, Outfit, CustomTag, WardrobeLocation, Trip } from './types';
import { clearAllDBData, getDB } from '../repositories/RepositoryFactory';
import { dataUrlToBlob } from './mediaStorage';

// Migrates any item images that were stored as embedded base64 data URLs into
// the dedicated binary `images` store, leaving only lightweight "img-*"
// references on the item record. This keeps `items` reads memory-light on
// mobile devices (a big win for offline PWA use). It is idempotent: images
// already stored as references are left untouched, so it is safe to run on
// every app start.
let imageMigrationRunning = false;

export async function normalizeEmbeddedImages(): Promise<void> {
  if (imageMigrationRunning || typeof window === 'undefined') return;
  imageMigrationRunning = true;
  try {
    const db = await getDB();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawItems = (await db.getAll('items')) as any[];
    let migrated = false;
    for (const raw of rawItems) {
      const images: unknown[] = Array.isArray(raw.images) ? raw.images : [];
      let itemChanged = false;
      const nextImages: string[] = [];
      for (const img of images) {
        if (typeof img === 'string' && img.startsWith('data:')) {
          const id = `img-${crypto.randomUUID()}`;
          await db.put('images', { id, blob: dataUrlToBlob(img), createdAt: Date.now() });
          nextImages.push(id);
          itemChanged = true;
        } else {
          nextImages.push(img as string);
        }
      }
      if (itemChanged) {
        raw.images = nextImages;
        await db.put('items', raw);
        migrated = true;
      }
    }
    if (migrated) {
      console.info('[Fitly] Migrated embedded images to binary blob storage.');
    }
  } catch (err) {
    // Non-fatal: the app keeps working even if the migration is interrupted.
    console.error('Image migration failed (non-fatal):', err);
  } finally {
    imageMigrationRunning = false;
  }
}

/**
 * Adds a single item. Used by the CSV import flow in SettingsModal.
 */
export async function addItem(item: ClothingItem): Promise<void> {
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

// ---------------------------------------------------------------------------
// Data migration helpers used by restoreFromBackup below.
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function migrateItem(raw: any): ClothingItem {
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

  // New fields
  if (raw.condition === undefined) raw.condition = 'good';
  if (raw.material === undefined) raw.material = '';
  if (raw.careInstructions === undefined) raw.careInstructions = '';
  if (raw.lastWashedAt === undefined) raw.lastWashedAt = 0;
  if (!raw.locationId) raw.locationId = 'loc-home'; // Default to Home location

  return raw as ClothingItem;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function migrateOutfit(raw: any): Outfit {
  if (!raw) return raw;
  if (raw.lastWornAt && !raw.wearLogs) {
    raw.wearLogs = [raw.lastWornAt];
  }
  if (!raw.wearLogs) raw.wearLogs = [];
  if (!raw.itemIds) raw.itemIds = [];
  return raw as Outfit;
}

// Backup & Restore
export async function restoreFromBackup(
  items: ClothingItem[],
  outfits: Outfit[],
  tags?: CustomTag[],
  locations?: WardrobeLocation[],
  trips?: Trip[]
): Promise<void> {
  const db = await getDB();
  const storeNames: Array<'items' | 'outfits' | 'tags' | 'locations' | 'trips'> = [
    'items', 'outfits', 'tags', 'locations', 'trips'
  ];
  const tx = db.transaction(storeNames, 'readwrite');

  const itemStore = tx.objectStore('items');
  const outfitStore = tx.objectStore('outfits');
  const tagStore = tx.objectStore('tags');
  const locStore = tx.objectStore('locations');
  const tripStore = tx.objectStore('trips');

  // 1. Clear existing data
  itemStore.clear();
  outfitStore.clear();

  // 2. Add new data from backup
  for (const item of items) {
    itemStore.put(migrateItem(item));
  }

  for (const outfit of outfits) {
    outfitStore.put(migrateOutfit(outfit));
  }

  if (tags && tags.length > 0) {
    tagStore.clear();
    for (const tag of tags) {
      tagStore.put(tag);
    }
  }

  if (locations && locations.length > 0) {
    locStore.clear();
    for (const loc of locations) {
      locStore.put(loc);
    }
  }

  if (trips && trips.length > 0) {
    tripStore.clear();
    for (const trip of trips) {
      tripStore.put(trip);
    }
  }

  await tx.done;

  // Normalize any base64 images brought in from an older backup so restored
  // items also benefit from reference-based (binary) image storage.
  await normalizeEmbeddedImages();
}

export async function clearAllAppData(): Promise<void> {
  await clearAllDBData();
  if (typeof window !== 'undefined') {
    localStorage.clear();
    sessionStorage.clear();
  }
  if (typeof caches !== 'undefined') {
    const keys = await caches.keys();
    await Promise.all(keys.map(key => caches.delete(key)));
  }
}
