import { openDB, IDBPDatabase } from 'idb';
import { ClothingItem, Outfit, CustomTag, DEFAULT_TAG_NAMES, PlannedOutfit, Trip } from './types';
import { v4 as uuidv4 } from 'uuid';

const DB_NAME = 'outfit-manager';
const DB_VERSION = 3;

type OutfitManagerDB = {
  items: {
    key: string;
    value: ClothingItem;
    indexes: { byCategory: string; byCreatedAt: number };
  };
  outfits: {
    key: string;
    value: Outfit;
    indexes: { byCreatedAt: number };
  };
  tags: {
    key: string;
    value: CustomTag;
  };
  plans: {
    key: string;
    value: PlannedOutfit;
    indexes: { byDate: string };
  };
  trips: {
    key: string;
    value: Trip;
  };
};

let dbPromise: Promise<IDBPDatabase<OutfitManagerDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<OutfitManagerDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const itemStore = db.createObjectStore('items', { keyPath: 'id' });
          itemStore.createIndex('byCategory', 'category');
          itemStore.createIndex('byCreatedAt', 'createdAt');
          
          const outfitStore = db.createObjectStore('outfits', { keyPath: 'id' });
          outfitStore.createIndex('byCreatedAt', 'createdAt');
          
          db.createObjectStore('tags', { keyPath: 'id' });
        }
        
        if (oldVersion < 3) {
          if (!db.objectStoreNames.contains('plans')) {
            const planStore = db.createObjectStore('plans', { keyPath: 'id' });
            planStore.createIndex('byDate', 'date');
          }
          if (!db.objectStoreNames.contains('trips')) {
            db.createObjectStore('trips', { keyPath: 'id' });
          }
        }
      },
    });
  }
  return dbPromise;
}

export async function seedTagsIfEmpty(): Promise<void> {
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

// Items
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
  
  return raw as ClothingItem;
}

function migrateOutfit(raw: any): Outfit {
  if (!raw) return raw;
  if (raw.lastWornAt && !raw.wearLogs) {
    raw.wearLogs = [raw.lastWornAt];
  }
  if (!raw.wearLogs) raw.wearLogs = [];
  if (!raw.itemIds) raw.itemIds = [];
  return raw as Outfit;
}

export async function getAllItems(): Promise<ClothingItem[]> {
  const db = await getDB();
  const rawItems = await db.getAll('items');
  return rawItems.map(migrateItem);
}

export async function getItem(id: string): Promise<ClothingItem | undefined> {
  const db = await getDB();
  const rawItem = await db.get('items', id);
  return rawItem ? migrateItem(rawItem) : undefined;
}

export async function addItem(item: ClothingItem): Promise<void> {
  try {
    const db = await getDB();
    await db.add('items', item);
  } catch (err: any) {
    if (err?.name === 'QuotaExceededError') {
      throw new Error('Device storage limit reached. Please clear old items or photos in Settings.');
    }
    throw err;
  }
}

export async function updateItem(item: ClothingItem): Promise<void> {
  try {
    const db = await getDB();
    await db.put('items', item);
  } catch (err: any) {
    if (err?.name === 'QuotaExceededError') {
      throw new Error('Device storage limit reached. Please clear old items or photos in Settings.');
    }
    throw err;
  }
}

export async function deleteItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('items', id);
}

// Outfits
export async function getAllOutfits(): Promise<Outfit[]> {
  const db = await getDB();
  const rawOutfits = await db.getAll('outfits');
  return rawOutfits.map(migrateOutfit);
}

export async function getOutfit(id: string): Promise<Outfit | undefined> {
  const db = await getDB();
  const rawOutfit = await db.get('outfits', id);
  return rawOutfit ? migrateOutfit(rawOutfit) : undefined;
}

export async function addOutfit(outfit: Outfit): Promise<void> {
  try {
    const db = await getDB();
    await db.add('outfits', outfit);
  } catch (err: any) {
    if (err?.name === 'QuotaExceededError') {
      throw new Error('Device storage limit reached.');
    }
    throw err;
  }
}

export async function updateOutfit(outfit: Outfit): Promise<void> {
  try {
    const db = await getDB();
    await db.put('outfits', outfit);
  } catch (err: any) {
    if (err?.name === 'QuotaExceededError') {
      throw new Error('Device storage limit reached.');
    }
    throw err;
  }
}

export async function deleteOutfit(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('outfits', id);
}

// Plans
export async function getAllPlans(): Promise<PlannedOutfit[]> {
  const db = await getDB();
  return db.getAll('plans');
}

export async function addPlan(plan: PlannedOutfit): Promise<void> {
  const db = await getDB();
  await db.add('plans', plan);
}

export async function updatePlan(plan: PlannedOutfit): Promise<void> {
  const db = await getDB();
  await db.put('plans', plan);
}

export async function deletePlan(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('plans', id);
}

// Trips
export async function getAllTrips(): Promise<Trip[]> {
  const db = await getDB();
  return db.getAll('trips');
}

export async function addTrip(trip: Trip): Promise<void> {
  const db = await getDB();
  await db.add('trips', trip);
}

export async function updateTrip(trip: Trip): Promise<void> {
  const db = await getDB();
  await db.put('trips', trip);
}

export async function deleteTrip(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('trips', id);
}

// Tags
export async function getAllTags(): Promise<CustomTag[]> {
  const db = await getDB();
  return db.getAll('tags');
}

export async function addTag(tag: CustomTag): Promise<void> {
  const db = await getDB();
  await db.add('tags', tag);
}

export async function updateTag(tag: CustomTag): Promise<void> {
  const db = await getDB();
  await db.put('tags', tag);
}

export async function deleteTag(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('tags', id);
}

// Backup & Restore
export async function restoreFromBackup(items: ClothingItem[], outfits: Outfit[], tags?: CustomTag[]): Promise<void> {
  const db = await getDB();
  const storeNames: Array<"items" | "outfits" | "tags"> = ['items', 'outfits', 'tags'];
  const tx = db.transaction(storeNames, 'readwrite');
  
  // 1. Clear existing data
  await tx.objectStore('items').clear();
  await tx.objectStore('outfits').clear();
  
  // 2. Add new data from backup
  const itemStore = tx.objectStore('items');
  for (const item of items) {
    await itemStore.add(migrateItem(item));
  }
  
  const outfitStore = tx.objectStore('outfits');
  for (const outfit of outfits) {
    await outfitStore.add(migrateOutfit(outfit));
  }

  if (tags) {
    const tagStore = tx.objectStore('tags');
    await tagStore.clear();
    for (const tag of tags) {
      await tagStore.add(tag);
    }
  }
  
  await tx.done;
}
