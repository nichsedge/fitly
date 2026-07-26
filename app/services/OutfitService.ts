import { Outfit, ClothingItem, Category } from '../lib/types';
import { v4 as uuidv4 } from 'uuid';

export class OutfitService {
  createOutfit(name: string, itemIds: string[], note: string = ''): Outfit {
    return {
      id: uuidv4(),
      name: name.trim() || 'Custom Look',
      note,
      itemIds,
      createdAt: Date.now(),
      wearLogs: [],
    };
  }

  getSuggestion(items: ClothingItem[]): ClothingItem[] {
    const mainCategories: Category[] = ['top', 'bottom', 'shoes'];
    const result: ClothingItem[] = [];

    for (const cat of mainCategories) {
      const candidates = items.filter(i => i.category === cat && i.status === 'ready');
      if (candidates.length > 0) {
        const sorted = [...candidates].sort((a, b) => {
          const aWears = (a.wearLogs || []).length;
          const bWears = (b.wearLogs || []).length;
          // Prefer items with fewer total wears
          if (aWears !== bWears) return aWears - bWears;
          // Tie-breaker: older last wear
          const aLast = aWears > 0 && a.wearLogs ? Math.max(...a.wearLogs) : 0;
          const bLast = bWears > 0 && b.wearLogs ? Math.max(...b.wearLogs) : 0;
          return aLast - bLast;
        });
        const pool = sorted.slice(0, Math.min(3, sorted.length));
        result.push(pool[Math.floor(Math.random() * pool.length)]);
      }
    }
    return result;
  }

  calculateOutfitCPW(outfit: Outfit, itemsMap: Map<string, ClothingItem>): number | null {
    const totalWears = outfit.wearLogs?.length || 0;
    if (totalWears === 0) return null;

    let totalPrice = 0;
    let hasPrice = false;
    for (const id of outfit.itemIds) {
      const item = itemsMap.get(id);
      if (item && item.price !== undefined && item.price > 0) {
        totalPrice += item.price;
        hasPrice = true;
      }
    }
    return hasPrice ? totalPrice / totalWears : null;
  }

  filterOutfits(outfits: Outfit[], query: string, itemsMap: Map<string, ClothingItem>): Outfit[] {
    if (!query || !query.trim()) return outfits;
    const q = query.toLowerCase().trim();

    return outfits.filter(outfit => {
      if (outfit.name.toLowerCase().includes(q) || outfit.note.toLowerCase().includes(q)) {
        return true;
      }
      return outfit.itemIds.some(id => {
        const item = itemsMap.get(id);
        return item && (item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q));
      });
    });
  }
}

export const outfitService = new OutfitService();
