import { ClothingItem, Outfit, CustomTag, DEFAULT_TAG_NAMES, PlannedOutfit, Trip, WardrobeLocation, DEFAULT_LOCATIONS } from './types';
import { v4 as uuidv4 } from 'uuid';
import { clearAllDBData, getDB } from '../repositories/RepositoryFactory';

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

export async function seedLocationsIfEmpty(): Promise<void> {
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

// Items
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
  } catch (err: unknown) {
    if ((err as { name?: string })?.name === 'QuotaExceededError') {
      throw new Error('Device storage limit reached. Please clear old items or photos in Settings.');
    }
    throw err;
  }
}

export async function updateItem(item: ClothingItem): Promise<void> {
  try {
    const db = await getDB();
    await db.put('items', item);
  } catch (err: unknown) {
    if ((err as { name?: string })?.name === 'QuotaExceededError') {
      throw new Error('Device storage limit reached. Please clear old items or photos in Settings.');
    }
    throw err;
  }
}

export async function deleteItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('items', id);
}

// Locations
export async function getAllLocations(): Promise<WardrobeLocation[]> {
  const db = await getDB();
  return db.getAll('locations');
}

export async function addLocation(location: WardrobeLocation): Promise<void> {
  const db = await getDB();
  await db.add('locations', location);
}

export async function updateLocation(location: WardrobeLocation): Promise<void> {
  const db = await getDB();
  await db.put('locations', location);
}

export async function deleteLocation(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('locations', id);
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
  } catch (err: unknown) {
    if ((err as { name?: string })?.name === 'QuotaExceededError') {
      throw new Error('Device storage limit reached.');
    }
    throw err;
  }
}

export async function updateOutfit(outfit: Outfit): Promise<void> {
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
export async function restoreFromBackup(
  items: ClothingItem[],
  outfits: Outfit[],
  tags?: CustomTag[],
  locations?: WardrobeLocation[],
  trips?: Trip[]
): Promise<void> {
  const db = await getDB();
  const storeNames: Array<"items" | "outfits" | "tags" | "locations" | "trips"> = [
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
