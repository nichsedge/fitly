import { openDB, IDBPDatabase } from 'idb';
import { ClothingItem, Outfit, CustomTag, PlannedOutfit, Trip, WardrobeLocation } from '../lib/types';

export const DB_NAME = 'outfit-manager';
export const DB_VERSION = 7;

export type OutfitManagerDB = {
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
  locations: {
    key: string;
    value: WardrobeLocation;
  };
  images: {
    key: string;
    value: { id: string; blob: Blob; createdAt: number };
  };
  mutationQueue: {
    key: number;
    value: {
      id?: number;
      type: 'item' | 'outfit' | 'tag' | 'location' | 'plan' | 'trip';
      action: 'add' | 'update' | 'delete';
      entityId: string;
      data: unknown;
      timestamp: number;
      retries?: number;
    };
    indexes: { timestamp: number };
  };
};

let dbPromise: Promise<IDBPDatabase<OutfitManagerDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<OutfitManagerDB>> {
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

        if (oldVersion < 4) {
          if (!db.objectStoreNames.contains('locations')) {
            db.createObjectStore('locations', { keyPath: 'id' });
          }
        }

        if (oldVersion < 5) {
          if (!db.objectStoreNames.contains('images')) {
            db.createObjectStore('images', { keyPath: 'id' });
          }
        }

        if (oldVersion < 6) {
          if (!db.objectStoreNames.contains('mutationQueue')) {
            const mutationStore = db.createObjectStore('mutationQueue', { keyPath: 'id', autoIncrement: true });
            mutationStore.createIndex('timestamp', 'timestamp');
          }
        }
      },
    });
  }
  return dbPromise;
}

export async function closeDB(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
}
