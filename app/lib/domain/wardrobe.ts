import { ClothingItem, Category, getColorLabel } from '../types';

export type WardrobeSortOption =
  | 'newest'
  | 'oldest'
  | 'name'
  | 'most-worn'
  | 'least-worn'
  | 'recently-worn'
  | 'price-high'
  | 'price-low'
  | 'cpw-best'
  | 'cpw-worst';

export interface WardrobeFilterOptions {
  activeLocationId: string;
  activeCategory: Category | 'all';
  activeTag: string;
  activeStatus: string;
  activeCondition: string;
  searchQuery: string;
}

export function filterWardrobeItems(
  items: ClothingItem[],
  filters: WardrobeFilterOptions
): ClothingItem[] {
  const { activeLocationId, activeCategory, activeTag, activeStatus, activeCondition, searchQuery } = filters;

  const query = searchQuery.trim().toLowerCase();

  return items.filter((item) => {
    const matchLocation = activeLocationId === 'all' || (item.locationId || 'loc-home') === activeLocationId;
    const matchCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchTag = activeTag === 'all' || item.tags.includes(activeTag);
    const matchStatus = activeStatus === 'all' || item.status === activeStatus;
    const matchCondition = activeCondition === 'all' || (item.condition || 'good') === activeCondition;

    if (!matchLocation || !matchCategory || !matchTag || !matchStatus || !matchCondition) {
      return false;
    }

    if (!query) return true;

    const colorLabel = getColorLabel(item.color || '');
    return (
      item.name.toLowerCase().includes(query) ||
      (item.brand && item.brand.toLowerCase().includes(query)) ||
      (item.material && item.material.toLowerCase().includes(query)) ||
      item.category.toLowerCase().includes(query) ||
      colorLabel.toLowerCase().includes(query) ||
      item.tags.some((t) => t.toLowerCase().includes(query))
    );
  });
}

export function sortWardrobeItems(
  items: ClothingItem[],
  sortBy: WardrobeSortOption
): ClothingItem[] {
  return [...items].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return (b.createdAt || 0) - (a.createdAt || 0);
      case 'oldest':
        return (a.createdAt || 0) - (b.createdAt || 0);
      case 'name':
        return (a.name || '').localeCompare(b.name || '');
      case 'most-worn': {
        const aWorns = a.wearLogs?.length || (a.lastWornAt ? 1 : 0);
        const bWorns = b.wearLogs?.length || (b.lastWornAt ? 1 : 0);
        return bWorns - aWorns;
      }
      case 'least-worn': {
        const aWorns = a.wearLogs?.length || (a.lastWornAt ? 1 : 0);
        const bWorns = b.wearLogs?.length || (b.lastWornAt ? 1 : 0);
        return aWorns - bWorns;
      }
      case 'recently-worn': {
        const aLast = a.wearLogs && a.wearLogs.length > 0 ? Math.max(...a.wearLogs) : a.lastWornAt || 0;
        const bLast = b.wearLogs && b.wearLogs.length > 0 ? Math.max(...b.wearLogs) : b.lastWornAt || 0;
        return bLast - aLast;
      }
      case 'price-high':
        return (b.price || 0) - (a.price || 0);
      case 'price-low':
        return (a.price || 0) - (b.price || 0);
      case 'cpw-best': {
        const getCPW = (item: ClothingItem) => {
          const wears = item.wearLogs ? item.wearLogs.length : 0;
          return item.price && wears > 0 ? item.price / wears : Infinity;
        };
        return getCPW(a) - getCPW(b);
      }
      case 'cpw-worst': {
        const getCPW = (item: ClothingItem) => {
          const wears = item.wearLogs ? item.wearLogs.length : 0;
          return item.price && wears > 0 ? item.price / wears : -1;
        };
        return getCPW(b) - getCPW(a);
      }
      default:
        return 0;
    }
  });
}
