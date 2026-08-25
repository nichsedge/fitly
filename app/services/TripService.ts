import { Trip, ClothingItem, Outfit, Category } from '../lib/types';
import { uuidv4 } from '../lib/id';

export class TripService {
  createTrip(name: string, startDate: string, endDate: string, destination?: string): Trip {
    return {
      id: uuidv4(),
      name: name.trim() || 'New Trip',
      startDate,
      endDate,
      destination,
      outfitIds: [],
      itemIds: [],
    };
  }

  calculateTripDays(startDate: string, endDate: string): number {
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return isNaN(diffDays) ? 1 : Math.max(1, diffDays);
  }

  getTripDurationDays(trip: Trip): number {
    return this.calculateTripDays(trip.startDate, trip.endDate);
  }

  getPackingItems(trip: Trip, allItems: ClothingItem[], allOutfits: Outfit[]): {
    packedItems: ClothingItem[];
    tripOutfits: Outfit[];
    missingCategories: string[];
  } {
    const itemMap = new Map(allItems.map(i => [i.id, i]));
    const outfitMap = new Map(allOutfits.map(o => [o.id, o]));
    return this.getPackingSummary(trip, itemMap, outfitMap);
  }

  getPackingSummary(trip: Trip, allItems: Map<string, ClothingItem>, allOutfits: Map<string, Outfit>) {
    const packedItems: ClothingItem[] = [];
    const tripOutfits: Outfit[] = [];
    const itemSet = new Set<string>();

    // Collect explicitly added items
    trip.itemIds?.forEach(id => {
      const item = allItems.get(id);
      if (item && !itemSet.has(id)) {
        packedItems.push(item);
        itemSet.add(id);
      }
    });

    // Collect items inside outfits
    trip.outfitIds?.forEach(id => {
      const outfit = allOutfits.get(id);
      if (outfit) {
        tripOutfits.push(outfit);
        outfit.itemIds.forEach(itemId => {
          const item = allItems.get(itemId);
          if (item && !itemSet.has(itemId)) {
            packedItems.push(item);
            itemSet.add(itemId);
          }
        });
      }
    });

    // Check missing essential categories
    const essentialCategories: Category[] = ['top', 'bottom', 'underwear', 'shoes'];
    const packedCategories = new Set(packedItems.map(i => i.category));
    const missingCategories = essentialCategories.filter(cat => !packedCategories.has(cat));

    return { packedItems, tripOutfits, missingCategories };
  }
}

export const tripService = new TripService();
