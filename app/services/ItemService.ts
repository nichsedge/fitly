import { ClothingItem, Category, getColorLabel } from '../lib/types';

export type WardrobeSortOption = 'newest' | 'oldest' | 'most-worn' | 'least-worn' | 'cpw-low' | 'cpw-high' | 'price-high' | 'price-low';

export interface WardrobeFilterOptions {
  category?: Category | 'all';
  tag?: string | 'all';
  status?: string | 'all';
  condition?: string | 'all';
  locationId?: string | 'all';
  sparkJoy?: string | 'all';
  searchQuery?: string;
  showRetired?: boolean;
}

export class ItemService {
  filterItems(
    items: ClothingItem[],
    filters: WardrobeFilterOptions
  ): ClothingItem[] {
    return items.filter(item => {
      const matchLocation = !filters.locationId || filters.locationId === 'all' || (item.locationId || 'loc-home') === filters.locationId;
      const matchCat = !filters.category || filters.category === 'all' || item.category === filters.category;
      const matchTag = !filters.tag || filters.tag === 'all' || item.tags.includes(filters.tag);
      const matchStatus = !filters.status || filters.status === 'all' || item.status === filters.status;
      const matchCondition = !filters.condition || filters.condition === 'all' || (item.condition || 'good') === filters.condition;
      const matchRetired = filters.showRetired || !item.retiredAt;
      const matchSparkJoy = !filters.sparkJoy || filters.sparkJoy === 'all'
        ? true
        : filters.sparkJoy === 'unrated'
          ? !item.sparkJoy
          : item.sparkJoy === filters.sparkJoy;

      let matchSearch = true;
      if (filters.searchQuery && filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase().trim();
        const colorLabel = getColorLabel(item.color || '');
        matchSearch =
          item.name.toLowerCase().includes(query) ||
          (item.brand || '').toLowerCase().includes(query) ||
          (item.material || '').toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query) ||
          colorLabel.toLowerCase().includes(query) ||
          item.tags.some(t => t.toLowerCase().includes(query));
      }

      return matchLocation && matchCat && matchTag && matchStatus && matchCondition && matchSparkJoy && matchRetired && matchSearch;
    });
  }

  sortItems(items: ClothingItem[], sortBy: WardrobeSortOption): ClothingItem[] {
    const sorted = [...items];
    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) => b.createdAt - a.createdAt);
      case 'oldest':
        return sorted.sort((a, b) => a.createdAt - b.createdAt);
      case 'most-worn':
        return sorted.sort((a, b) => (b.wearLogs?.length || 0) - (a.wearLogs?.length || 0));
      case 'least-worn':
        return sorted.sort((a, b) => (a.wearLogs?.length || 0) - (b.wearLogs?.length || 0));
      case 'cpw-low':
        return sorted.sort((a, b) => {
          const cpwA = this.calculateCPW(a) ?? Infinity;
          const cpwB = this.calculateCPW(b) ?? Infinity;
          return cpwA - cpwB;
        });
      case 'cpw-high':
        return sorted.sort((a, b) => {
          const cpwA = this.calculateCPW(a) ?? -1;
          const cpwB = this.calculateCPW(b) ?? -1;
          return cpwB - cpwA;
        });
      case 'price-high':
        return sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
      case 'price-low':
        return sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
      default:
        return sorted;
    }
  }

  calculateCPW(item: ClothingItem): number | null {
    const wearCount = item.wearLogs?.length || 0;
    if (item.price !== undefined && item.price > 0 && wearCount > 0) {
      return item.price / wearCount;
    }
    return null;
  }

  getWornItemsSinceWash(items: ClothingItem[]): Array<{ item: ClothingItem; wearsSinceWash: number }> {
    return items
      .map(item => {
        const lastWash = item.lastWashedAt || 0;
        const wearsSinceWash = (item.wearLogs || []).filter(ts => ts > lastWash).length;
        return { item, wearsSinceWash };
      })
      .filter(entry => entry.wearsSinceWash > 0)
      .sort((a, b) => b.wearsSinceWash - a.wearsSinceWash);
  }

  getCategoryCounts(items: ClothingItem[]): Record<string, number> {
    const counts: Record<string, number> = {};
    items.forEach(item => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });
    return counts;
  }

  getTotalValue(items: ClothingItem[]): number {
    return items.reduce((acc, i) => acc + (i.price || 0), 0);
  }

  getWearStats(items: ClothingItem[]): { totalWears: number; avgCPW: number } {
    let totalWears = 0;
    let validCPWSum = 0;
    let validCPWCount = 0;

    items.forEach(item => {
      const wears = item.wearLogs?.length || 0;
      totalWears += wears;
      const cpw = this.calculateCPW(item);
      if (cpw !== null) {
        validCPWSum += cpw;
        validCPWCount++;
      }
    });

    return {
      totalWears,
      avgCPW: validCPWCount > 0 ? validCPWSum / validCPWCount : 0,
    };
  }
}

export const itemService = new ItemService();
